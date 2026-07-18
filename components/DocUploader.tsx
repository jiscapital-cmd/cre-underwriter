"use client";

import { useState } from "react";
import { isSpreadsheet, toCsvFile } from "@/lib/files";

type DocType = "Offering Memorandum" | "Rent Roll" | "T-12";

type Props = {
  onExtracted: (docType: DocType, extracted: Record<string, unknown>) => void;
};

const DOC_TYPES: DocType[] = ["Offering Memorandum", "Rent Roll", "T-12"];

export default function DocUploader({ onExtracted }: Props) {
  const [busy, setBusy] = useState<DocType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorRaw, setErrorRaw] = useState<string | null>(null);
  const [done, setDone] = useState<Record<string, boolean>>({});

  async function handleFile(docType: DocType, file: File) {
    setBusy(docType);
    setError(null);
    setErrorRaw(null);
    try {
      const sendFile = isSpreadsheet(file) ? await toCsvFile(file) : file;
      const form = new FormData();
      form.append("files", sendFile);
      form.append("docType", docType);
      const res = await fetch("/api/extract", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) {
        setErrorRaw(json.raw ?? null);
        throw new Error(json.error || "Extraction failed");
      }
      onExtracted(docType, json.extracted);
      setDone((d) => ({ ...d, [docType]: true }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Extraction failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="card">
      <h2 className="font-semibold mb-1">Upload deal documents</h2>
      <p className="text-sm text-silver mb-4">
        PDF offering memoranda, or Excel/CSV rent rolls and trailing-12 statements. Claude reads
        each file and fills in the inputs below — review before relying on the numbers.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {DOC_TYPES.map((docType) => (
          <label
            key={docType}
            className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-lg p-4 text-sm cursor-pointer transition ${
              done[docType] ? "border-emerald-400/60 bg-emerald-500/10" : "border-cardBorder hover:border-ink/40"
            }`}
          >
            <span className="font-medium">{docType}</span>
            <span className="text-xs text-silver/70">
              {busy === docType ? "Extracting..." : done[docType] ? "Extracted ✓" : "Click to upload"}
            </span>
            <input
              type="file"
              accept=".pdf,.xlsx,.xls,.csv"
              className="hidden"
              disabled={busy !== null}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(docType, file);
                e.target.value = "";
              }}
            />
          </label>
        ))}
      </div>
      {error && (
        <div className="mt-3">
          <p className="text-sm text-red-300">{error}</p>
          {errorRaw && (
            <details className="mt-2">
              <summary className="text-xs text-silver/70 cursor-pointer">Show raw model output</summary>
              <pre className="text-xs bg-panel/40 border border-cardBorder rounded p-2 mt-1 overflow-x-auto whitespace-pre-wrap">
                {errorRaw}
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
