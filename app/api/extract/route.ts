import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { jsonrepair } from "jsonrepair";

export const runtime = "nodejs";
export const maxDuration = 60;

const EXTRACTION_SCHEMA = `Return ONLY valid JSON (no markdown fences, no commentary) matching this shape:
{
  "propertyName": string | null,
  "assetType": string | null,
  "purchasePrice": number | null,
  "unitCount": number | null,
  "marketGPRAnnual": number | null,        // annualized MARKET/asking gross potential rent (from an OM or rent roll's "market rent" column) — NOT the same as currentGPRAnnual
  "currentGPRAnnual": number | null,       // annualized ACTUAL/in-place gross potential rent — the top-line "Gross Potential Rent" or "Rental Income" figure on a T-12, BEFORE any vacancy/concession/bad-debt deduction. If the T-12 only shows rent net of vacancy, back into GPR by adding the vacancy loss line back.
  "otherIncomeAnnual": number | null,      // parking, laundry, fees, etc.
  "egiAnnual": number | null,              // Effective Gross Income AS REPORTED, if the document states it directly
  "opexYear1Annual": number | null,        // total operating expenses excluding management fee, trailing 12 or year-1 — sum of opexLineItems if a total isn't explicitly stated
  "opexLineItems": [ { "label": string, "annualAmount": number } ],  // EVERY individual expense line as its own row (e.g. "Payroll", "Repairs & Maintenance", "Utilities", "Insurance", "Property Taxes", "Contract Services", "Advertising") — do not pre-aggregate into one lump sum; the caller categorizes these itself using the labels
  "managementFeePct": number | null,       // as a decimal, e.g. 0.03
  "vacancyRate": number | null,            // as a decimal, vacancy+concession+bad-debt loss as % of GPR
  "vacancyLossAnnual": number | null,      // the actual $ vacancy/credit loss line item, if the document states a dollar figure rather than (or in addition to) a %
  "noiAnnual": number | null,              // net operating income AS REPORTED on the document, if a NOI line exists (T-12s usually have one) — don't calculate this yourself
  "rentRoll": [ { "unitType": string, "unitCount": number, "avgSF": number | null, "currentRentMonthly": number | null, "marketRentMonthly": number | null } ],
  "salesComps": [ { "property": string, "units": number | null, "salePrice": number | null, "pricePerUnit": number | null, "capRate": number | null, "saleDate": string | null } ],
  "rentComps": [ { "property": string, "unitType": string | null, "avgSF": number | null, "askingRent": number | null, "rentPerSF": number | null } ],
  "supplyPipeline": [ { "project": string, "units": number | null, "deliveryDate": string | null, "distanceMiles": number | null } ],
  "demographics": {
    "populationGrowth1mi": string | null,
    "medianHHIncome": string | null,
    "unemploymentRate": string | null,
    "submarketOccupancy": string | null,
    "submarketRentGrowthTTM": string | null
  },
  "notes": string | null                   // anything unusual worth flagging to the analyst
}
Only offering memoranda typically contain salesComps, rentComps, supplyPipeline, and demographics — leave those as empty arrays / null fields for rent roll or T-12 documents unless the data is actually present.
If a field cannot be determined from the document, use null. Do not guess numbers you cannot find — use null instead.
Keep "notes" to at most 2-3 short sentences (under 400 characters) — put the flagged issue, not a full audit narrative. Emit all numeric/array fields BEFORE notes so the model's most important output can't be lost to truncation.`;

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not configured on the server." },
      { status: 500 }
    );
  }

  const formData = await req.formData();
  const files = formData.getAll("files") as File[];
  const docType = (formData.get("docType") as string) || "unspecified";

  if (!files.length) {
    return NextResponse.json({ error: "No files uploaded." }, { status: 400 });
  }

  const client = new Anthropic({ apiKey });

  // `document` content blocks (PDF support) postdate this SDK version's type
  // definitions, so this is typed loosely and cast at the call site below.
  const content: any[] = [];
  for (const file of files) {
    const bytes = Buffer.from(await file.arrayBuffer());
    const base64 = bytes.toString("base64");
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

    if (isPdf) {
      content.push({
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: base64 },
      });
    } else {
      // Excel/CSV: send as plain text extraction instruction isn't possible directly,
      // so we ask the client to send CSV text for spreadsheets (see /lib/files.ts note).
      content.push({
        type: "text",
        text: `File "${file.name}" contents (converted to CSV/text before upload):\n\n${bytes.toString("utf-8")}`,
      });
    }
  }

  content.push({
    type: "text",
    text: `This document is a broker-provided ${docType} for a commercial real estate acquisition. Extract the underwriting-relevant data.\n\n${EXTRACTION_SCHEMA}`,
  });

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 16000,
      // Disable extended thinking — for structured JSON extraction it only
      // risks consuming the token budget before any output is produced (see
      // /api/assistant for a case where this silently returned empty output).
      ...({ thinking: { type: "disabled" } } as object),
      messages: [{ role: "user", content: content as Anthropic.MessageParam["content"] }],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    const raw = textBlock && "text" in textBlock ? textBlock.text : "{}";

    // Strip markdown fences, then extract the outermost {...} in case the
    // model added any commentary before/after the JSON despite instructions.
    const withoutFences = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "");
    const firstBrace = withoutFences.indexOf("{");
    const lastBrace = withoutFences.lastIndexOf("}");
    const candidate =
      firstBrace !== -1 && lastBrace > firstBrace
        ? withoutFences.slice(firstBrace, lastBrace + 1)
        : withoutFences;

    let parsed: unknown;
    try {
      parsed = JSON.parse(candidate);
    } catch {
      // Handles a response truncated mid-string (e.g. cut off inside "notes")
      // by closing any open strings/brackets rather than discarding the
      // otherwise-complete extraction.
      try {
        parsed = JSON.parse(jsonrepair(candidate));
      } catch {
        const truncated = message.stop_reason === "max_tokens";
        return NextResponse.json(
          {
            error: truncated
              ? "The model's response was cut off before it finished (document may be too large/complex). Try splitting the file or a shorter excerpt."
              : "Model did not return valid JSON.",
            raw: raw.slice(0, 4000),
          },
          { status: 502 }
        );
      }
    }

    return NextResponse.json({ docType, extracted: parsed });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown extraction error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
