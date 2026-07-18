"use client";

import { SensitivityCell } from "@/lib/underwriting";
import { fmtPct } from "@/lib/format";

const LABELS = ["-1.0%", "-0.5%", "Base", "+0.5%", "+1.0%"];

function cellColor(irr: number | null, base: number | null): string {
  if (irr === null || base === null) return "bg-panel/40";
  if (irr >= base + 0.02) return "bg-emerald-500/15";
  if (irr >= base) return "bg-emerald-500/10";
  if (irr >= base - 0.02) return "bg-amber-500/10";
  return "bg-red-500/10";
}

export default function SensitivityGrid({ grid }: { grid: SensitivityCell[][] }) {
  const base = grid[2]?.[2]?.irr ?? null;
  return (
    <div className="card overflow-x-auto">
      <h2 className="font-semibold mb-1">Sensitivity: Levered IRR</h2>
      <p className="text-sm text-silver mb-4">Rows: exit cap rate · Columns: rent growth rate</p>
      <table className="text-sm border-collapse">
        <thead>
          <tr>
            <th className="p-2 text-silver/70 text-xs font-normal">Exit Cap \ Rent Gr</th>
            {LABELS.map((l) => (
              <th key={l} className="p-2 text-center text-silver font-medium">
                {l}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grid.map((row, i) => (
            <tr key={i}>
              <td className="p-2 text-silver font-medium">{LABELS[i]}</td>
              {row.map((cell, j) => (
                <td key={j} className={`p-2 text-center tabular-nums rounded ${cellColor(cell.irr, base)}`}>
                  {fmtPct(cell.irr)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
