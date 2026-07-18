"use client";

import { SourcesAndUses } from "@/lib/underwriting";
import { fmtPct, fmtUsd } from "@/lib/format";

export default function SourcesUses({ data }: { data: SourcesAndUses }) {
  const balanced = Math.abs(data.totalUses - data.totalSources) < 1;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold">Sources & Uses</h2>
        {!balanced && (
          <span className="text-xs font-medium text-red-300">
            Out of balance by {fmtUsd(data.totalUses - data.totalSources)}
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <div className="label mb-2">Uses</div>
          <table className="w-full text-sm">
            <tbody>
              {data.uses.map((line) => (
                <tr key={line.label} className="border-b border-cardBorder">
                  <td className="py-1.5 text-silver">{line.label}</td>
                  <td className="py-1.5 text-right tabular-nums">{fmtUsd(line.amount)}</td>
                  <td className="py-1.5 pl-2 text-right tabular-nums text-silver/70 w-16">
                    {fmtPct(line.amount / data.totalUses)}
                  </td>
                </tr>
              ))}
              <tr className="font-semibold">
                <td className="py-1.5">Total Uses</td>
                <td className="py-1.5 text-right tabular-nums">{fmtUsd(data.totalUses)}</td>
                <td className="py-1.5 pl-2 text-right tabular-nums text-silver/70">100%</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div>
          <div className="label mb-2">Sources</div>
          <table className="w-full text-sm">
            <tbody>
              {data.sources.map((line) => (
                <tr key={line.label} className="border-b border-cardBorder">
                  <td className="py-1.5 text-silver">{line.label}</td>
                  <td className="py-1.5 text-right tabular-nums">{fmtUsd(line.amount)}</td>
                  <td className="py-1.5 pl-2 text-right tabular-nums text-silver/70 w-16">
                    {fmtPct(line.amount / data.totalSources)}
                  </td>
                </tr>
              ))}
              <tr className="font-semibold">
                <td className="py-1.5">Total Sources</td>
                <td className="py-1.5 text-right tabular-nums">{fmtUsd(data.totalSources)}</td>
                <td className="py-1.5 pl-2 text-right tabular-nums text-silver/70">100%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
