"use client";

import { useMemo } from "react";
import { createPortal } from "react-dom";

function renderInline(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

/** Minimal markdown renderer scoped to exactly what lib/report.ts emits:
 * #/##/### headers, pipe tables, **bold**, "- " bullets, "---" rules, and
 * plain paragraphs. Not a general-purpose parser. */
function markdownToHtml(md: string): string {
  const lines = md.split("\n");
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith("### ")) {
      out.push(`<h3>${renderInline(line.slice(4))}</h3>`);
      i++;
      continue;
    }
    if (line.startsWith("## ")) {
      out.push(`<h2>${renderInline(line.slice(3))}</h2>`);
      i++;
      continue;
    }
    if (line.startsWith("# ")) {
      out.push(`<h1>${renderInline(line.slice(2))}</h1>`);
      i++;
      continue;
    }
    if (line.trim() === "---") {
      out.push("<hr />");
      i++;
      continue;
    }
    if (line.startsWith("| ")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].startsWith("| ")) {
        tableLines.push(lines[i]);
        i++;
      }
      const rows = tableLines.filter((l, idx) => idx !== 1).map((l) =>
        l
          .slice(1, -1)
          .split("|")
          .map((c) => c.trim())
      );
      const [headerRow, ...bodyRows] = rows;
      out.push("<table><thead><tr>");
      headerRow.forEach((c) => out.push(`<th>${renderInline(c)}</th>`));
      out.push("</tr></thead><tbody>");
      bodyRows.forEach((r) => {
        out.push("<tr>");
        r.forEach((c) => out.push(`<td>${renderInline(c)}</td>`));
        out.push("</tr>");
      });
      out.push("</tbody></table>");
      continue;
    }
    if (line.match(/^\d+\. /)) {
      const listLines: string[] = [];
      while (i < lines.length && lines[i].match(/^\d+\. /)) {
        listLines.push(lines[i]);
        i++;
      }
      out.push("<ol>");
      listLines.forEach((l) => out.push(`<li>${renderInline(l.replace(/^\d+\.\s/, ""))}</li>`));
      out.push("</ol>");
      continue;
    }
    if (line.startsWith("- ")) {
      const listLines: string[] = [];
      while (i < lines.length && lines[i].startsWith("- ")) {
        listLines.push(lines[i]);
        i++;
      }
      out.push("<ul>");
      listLines.forEach((l) => out.push(`<li>${renderInline(l.slice(2))}</li>`));
      out.push("</ul>");
      continue;
    }
    if (line.trim() === "") {
      i++;
      continue;
    }
    if (line.startsWith("*") && line.endsWith("*") && !line.startsWith("**")) {
      out.push(`<p class="italic">${renderInline(line.slice(1, -1))}</p>`);
      i++;
      continue;
    }
    out.push(`<p>${renderInline(line)}</p>`);
    i++;
  }

  return out.join("\n");
}

const REPORT_STYLES = `
  .report-body h1 {
    font-size: 26px;
    font-weight: 700;
    color: #0a1f3d;
    margin: 0 0 4px;
  }
  .report-body h2 {
    font-size: 19px;
    font-weight: 700;
    color: #0a1f3d;
    margin: 32px 0 12px;
    padding-top: 8px;
    border-top: 1px solid #e5e9f0;
  }
  .report-body h2:first-of-type {
    border-top: none;
    margin-top: 0;
  }
  .report-body h3 {
    font-size: 15px;
    font-weight: 700;
    color: #0a1f3d;
    margin: 20px 0 8px;
  }
  .report-body p {
    font-size: 13.5px;
    line-height: 1.6;
    color: #2b3444;
    margin: 0 0 10px;
  }
  .report-body p.italic {
    font-style: italic;
    color: #64748b;
  }
  .report-body hr {
    border: none;
    border-top: 1px solid #e5e9f0;
    margin: 20px 0;
  }
  .report-body ul,
  .report-body ol {
    margin: 0 0 12px;
    padding-left: 22px;
    font-size: 13.5px;
    color: #2b3444;
    line-height: 1.6;
  }
  .report-body table {
    width: 100%;
    border-collapse: collapse;
    margin: 12px 0 18px;
    font-size: 12.5px;
  }
  .report-body th {
    text-align: left;
    background: #f4f6fa;
    color: #0a1f3d;
    font-weight: 700;
    padding: 6px 10px;
    border: 1px solid #e5e9f0;
    white-space: nowrap;
  }
  .report-body td {
    padding: 6px 10px;
    border: 1px solid #e5e9f0;
    color: #2b3444;
    vertical-align: top;
  }
  .report-body strong {
    color: #0a1f3d;
  }
  .report-print-only {
    display: none;
  }
  @media print {
    @page {
      margin: 0.6in;
    }
    /* Hide the live app and the interactive on-screen modal entirely, and
     * print only the plain, unconstrained copy below — the modal is a
     * fixed/overflow-scrolling element, which clips print output to a
     * single viewport-height page no matter what CSS overrides are applied
     * to it, so fighting that cascade isn't reliable. A separate copy with
     * no positioning ancestry sidesteps the problem completely. */
    .app-root,
    .report-overlay {
      display: none !important;
    }
    .report-print-only {
      display: block !important;
    }
    .report-body table {
      page-break-inside: avoid;
    }
    .report-body h2 {
      page-break-after: avoid;
    }
  }
`;

export default function ReportModal({ markdown, onClose }: { markdown: string; onClose: () => void }) {
  const html = useMemo(() => markdownToHtml(markdown), [markdown]);

  function downloadMd() {
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "underwriting-report.md";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <div className="report-overlay fixed inset-0 z-50 bg-black/60 flex items-start justify-center overflow-y-auto py-8 px-4">
        <div className="bg-white text-[#1a1a1a] rounded-lg w-full max-w-[900px] shadow-2xl">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 sticky top-0 bg-white rounded-t-lg">
            <h2 className="font-semibold text-[#0A1F3D]">Full Underwriting Report</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={downloadMd}
                className="text-sm font-medium px-3 py-1.5 rounded-md border border-slate-300 text-[#0A1F3D] hover:bg-slate-50"
              >
                Download .md
              </button>
              <button
                onClick={() => window.print()}
                className="text-sm font-medium px-3 py-1.5 rounded-md bg-[#FFCC00] text-[#0A1F3D] font-semibold hover:opacity-90"
              >
                Print / Save as PDF
              </button>
              <button onClick={onClose} className="text-sm font-medium px-3 py-1.5 rounded-md text-slate-500 hover:text-[#0A1F3D]">
                Close
              </button>
            </div>
          </div>
          <div className="report-body px-10 py-8" dangerouslySetInnerHTML={{ __html: html }} />
        </div>
      </div>

      {typeof document !== "undefined" &&
        createPortal(
          <div className="report-print-only">
            <div className="report-body" dangerouslySetInnerHTML={{ __html: html }} />
          </div>,
          document.body
        )}

      <style jsx global>{REPORT_STYLES}</style>
    </>
  );
}
