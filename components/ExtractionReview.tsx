"use client";

import { ExtractionEntry } from "@/lib/applyExtraction";

const PREVIEW_KEYS = [
  "purchasePrice",
  "unitCount",
  "marketGPRAnnual",
  "currentGPRAnnual",
  "otherIncomeAnnual",
  "opexYear1Annual",
  "managementFeePct",
  "vacancyRate",
  "noiAnnual",
];

export default function ExtractionReview({
  entries,
  onApply,
  applied,
}: {
  entries: ExtractionEntry[];
  onApply: () => void;
  applied: boolean;
}) {
  if (entries.length === 0) return null;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold">Extracted from documents</h2>
        <button
          onClick={onApply}
          className="bg-emerald-600 text-white text-sm font-medium px-4 py-2 rounded-md hover:opacity-90"
        >
          {applied ? "Re-apply to Model" : "Apply to Model"}
        </button>
      </div>
      <p className="text-sm text-silver mb-4">
        Review the raw values Claude pulled from each document, then click Apply to update the
        inputs and recalculate the model. Uploading more files? Re-run Apply once you're done.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {entries.map((entry, i) => (
          <div key={i} className="border border-cardBorder rounded-lg p-3">
            <div className="font-medium text-sm mb-2">{entry.docType}</div>
            <dl className="text-xs space-y-1">
              {PREVIEW_KEYS.map((key) => {
                const val = entry.extracted?.[key];
                if (val === undefined || val === null) return null;
                return (
                  <div key={key} className="flex justify-between gap-2">
                    <dt className="text-silver/70">{key}</dt>
                    <dd className="font-medium text-right">{String(val)}</dd>
                  </div>
                );
              })}
              {Array.isArray(entry.extracted?.rentRoll) && (
                <div className="flex justify-between gap-2">
                  <dt className="text-silver/70">rentRoll rows</dt>
                  <dd className="font-medium">{entry.extracted.rentRoll.length}</dd>
                </div>
              )}
              {Array.isArray(entry.extracted?.opexLineItems) && (
                <div className="flex justify-between gap-2">
                  <dt className="text-silver/70">opex line items</dt>
                  <dd className="font-medium">{entry.extracted.opexLineItems.length}</dd>
                </div>
              )}
              {Array.isArray(entry.extracted?.salesComps) && entry.extracted.salesComps.length > 0 && (
                <div className="flex justify-between gap-2">
                  <dt className="text-silver/70">sales comps</dt>
                  <dd className="font-medium">{entry.extracted.salesComps.length}</dd>
                </div>
              )}
              {Array.isArray(entry.extracted?.rentComps) && entry.extracted.rentComps.length > 0 && (
                <div className="flex justify-between gap-2">
                  <dt className="text-silver/70">rent comps</dt>
                  <dd className="font-medium">{entry.extracted.rentComps.length}</dd>
                </div>
              )}
              {Array.isArray(entry.extracted?.supplyPipeline) && entry.extracted.supplyPipeline.length > 0 && (
                <div className="flex justify-between gap-2">
                  <dt className="text-silver/70">supply pipeline items</dt>
                  <dd className="font-medium">{entry.extracted.supplyPipeline.length}</dd>
                </div>
              )}
              {entry.extracted?.notes && (
                <div className="pt-1 text-silver italic">{entry.extracted.notes}</div>
              )}
            </dl>
          </div>
        ))}
      </div>
    </div>
  );
}
