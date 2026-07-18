"use client";

import { AssumptionRow, Confidence } from "@/lib/assumptionsRegister";

const CONF_CLASSES: Record<Confidence, string> = {
  High: "bg-emerald-500/15 text-emerald-300",
  Medium: "bg-amber-500/15 text-amber-300",
  Low: "bg-red-500/15 text-red-300",
};

export default function AssumptionsRegisterTab({ rows }: { rows: AssumptionRow[] }) {
  return (
    <div className="card overflow-x-auto">
      <h2 className="font-semibold mb-1">Assumptions Register</h2>
      <p className="text-sm text-silver mb-4">
        Every material input, its source, and confidence level — separates verified facts from underwriting
        assumptions so reviewers know exactly what to stress-test during DD.
      </p>
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left border-b border-cardBorder">
            <th className="py-2 pr-3 font-medium text-silver">Category</th>
            <th className="py-2 pr-3 font-medium text-silver">Assumption</th>
            <th className="py-2 pr-3 font-medium text-silver">Value</th>
            <th className="py-2 pr-3 font-medium text-silver">Source</th>
            <th className="py-2 pr-3 font-medium text-silver">Confidence</th>
            <th className="py-2 font-medium text-silver">Footnote</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-cardBorder align-top">
              <td className="py-2 pr-3 text-silver whitespace-nowrap">{r.category}</td>
              <td className="py-2 pr-3 font-medium whitespace-nowrap">{r.assumption}</td>
              <td className="py-2 pr-3 tabular-nums whitespace-nowrap">{r.value}</td>
              <td className="py-2 pr-3 text-silver whitespace-nowrap">{r.source}</td>
              <td className="py-2 pr-3">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${CONF_CLASSES[r.confidence]}`}>
                  {r.confidence}
                </span>
              </td>
              <td className="py-2 text-silver min-w-[260px]">{r.footnote}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
