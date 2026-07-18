import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 90;

const SYSTEM_PROMPT = `You are a senior commercial real estate underwriting analyst sitting alongside a colleague who is actively building an acquisition model. You have full read access to their live model — every input assumption and every calculated output — provided below as JSON.

Your job:
- Identify underwriting issues: unrealistic or internally inconsistent assumptions, numbers that don't reconcile with each other, red flags versus normal market underwriting practice, and anything that would make an investment committee or lender push back.
- Give specific, actionable suggestions to improve the model or strengthen the deal/negotiating position — reference exact numbers and field names from the data, not generic advice.
- If the user asks a specific question, answer it using the data provided. Don't make up numbers that aren't in the snapshot.
- Be direct and concise. This is a working session, not a formal report — skip preamble, use short paragraphs or a tight bulleted list, and prioritize the 3-5 things that matter most rather than exhaustively listing everything.
- If something in the model looks fine, don't invent a problem with it just to have more to say.

The deal snapshot (current state of every tab in the app):`;

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY is not configured on the server." }, { status: 500 });
  }

  const body = await req.json();
  const { snapshot, messages } = body as {
    snapshot: unknown;
    messages: { role: "user" | "assistant"; content: string }[];
  };

  if (!snapshot || !Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "Missing snapshot or messages." }, { status: 400 });
  }

  const client = new Anthropic({ apiKey });

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 8000,
      // Sonnet 5 defaults to extended thinking on complex prompts, which can
      // consume the entire token budget on the (invisible) thinking block
      // and leave nothing for the actual reply. This SDK version predates
      // typed support for the `thinking` param, but the API still honors it
      // when passed through.
      ...({ thinking: { type: "disabled" } } as object),
      system: `${SYSTEM_PROMPT}\n\n${JSON.stringify(snapshot)}`,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });

    const textBlock = message.content.find((b) => b.type === "text");
    const reply = textBlock && "text" in textBlock ? textBlock.text : "";

    return NextResponse.json({ reply });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown assistant error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
