"use client";

import { ScorecardMetric, ScoreColor } from "@/lib/scorecard";
import { FinalRecommendation, Grade, RiskRow, TrueNetYieldModel } from "@/lib/riskAnalysis";
import { fmtPct, fmtUsd } from "@/lib/format";

const COLOR_CLASSES: Record<ScoreColor, string> = {
  green: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  yellow: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  red: "bg-red-500/15 text-red-300 border-red-500/30",
};

const DOT_CLASSES: Record<ScoreColor, string> = {
  green: "bg-emerald-500",
  yellow: "bg-amber-500",
  red: "bg-red-500",
};

const GRADE_CLASSES: Record<Grade, string> = {
  A: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  B: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  C: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  D: "bg-red-500/15 text-red-300 border-red-500/30",
};

const VERDICT_CLASSES: Record<FinalRecommendation["verdict"], string> = {
  Proceed: "bg-emerald-500/15 text-emerald-300",
  "Proceed with Conditions": "bg-amber-500/15 text-amber-300",
  "Do Not Proceed": "bg-red-500/15 text-red-300",
};

export default function ScorecardTab({
  metrics,
  thesis,
  yieldModel,
  riskRows,
  recommendation,
}: {
  metrics: ScorecardMetric[];
  thesis: string[];
  yieldModel: TrueNetYieldModel;
  riskRows: RiskRow[];
  recommendation: FinalRecommendation;
}) {
  return (
    <div className="space-y-6">
      {/* 1. Investment Thesis */}
      <div className="card">
        <h2 className="font-semibold mb-4">Investment Thesis</h2>
        <div className="space-y-3.5 text-sm text-white leading-relaxed max-w-[75ch]">
          {thesis.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </div>

      {/* 2. True Net Yield Analysis */}
      <div className="card overflow-x-auto">
        <h2 className="font-semibold mb-1">True Net Yield Analysis</h2>
        <p className="text-sm text-silver mb-4">
          Walks the advertised gross-rent yield down through real operating frictions to a true net yield — the
          number that actually determines whether this basis works.
        </p>
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left border-b border-cardBorder">
              <th className="py-2 pr-3 font-medium text-silver">Line Item</th>
              <th className="py-2 pr-3 font-medium text-silver text-right">Annual $</th>
              <th className="py-2 pr-3 font-medium text-silver text-right">Yield Impact</th>
              <th className="py-2 font-medium text-silver text-right">Running Yield</th>
            </tr>
          </thead>
          <tbody>
            {yieldModel.rows.map((r, i) => {
              const isBase = i === 0;
              return (
                <tr key={r.label} className={`border-b border-cardBorder ${isBase ? "font-semibold" : ""}`}>
                  <td className="py-1.5 pr-3 text-silver">{r.label}</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums">{fmtUsd(r.annual)}</td>
                  <td className={`py-1.5 pr-3 text-right tabular-nums ${r.pctOfPrice < 0 ? "text-red-300" : r.pctOfPrice > 0 && !isBase ? "text-emerald-300" : ""}`}>
                    {isBase ? "—" : `${r.pctOfPrice >= 0 ? "+" : ""}${(r.pctOfPrice * 100).toFixed(2)} pts`}
                  </td>
                  <td className="py-1.5 text-right tabular-nums text-gold">{fmtPct(r.runningYield, 2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 pt-4 border-t border-cardBorder">
          <div>
            <div className="label">Advertised Yield</div>
            <div className="stat-value">{fmtPct(yieldModel.advertisedYield, 2)}</div>
          </div>
          <div>
            <div className="label">True Net Yield</div>
            <div className="stat-value">{fmtPct(yieldModel.trueNetYield, 2)}</div>
          </div>
          <div>
            <div className="label">Delta</div>
            <div className="stat-value text-red-300">-{(yieldModel.deltaPoints * 100).toFixed(2)} pts</div>
          </div>
          <div>
            <div className="label">% Reduction</div>
            <div className="stat-value text-red-300">-{fmtPct(yieldModel.pctReduction, 0)}</div>
          </div>
        </div>
      </div>

      {/* 3. Risk Scorecard */}
      <div className="card overflow-x-auto">
        <h2 className="font-semibold mb-4">Risk Scorecard</h2>
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left border-b border-cardBorder">
              <th className="py-2 pr-3 font-medium text-silver">Risk Category</th>
              <th className="py-2 pr-3 font-medium text-silver">Grade</th>
              <th className="py-2 font-medium text-silver">Key Finding</th>
            </tr>
          </thead>
          <tbody>
            {riskRows.map((r) => (
              <tr
                key={r.category}
                className={`border-b border-cardBorder align-top ${r.category === "Overall Deal Risk" ? "font-semibold" : ""}`}
              >
                <td className="py-2.5 pr-3 whitespace-nowrap">{r.category}</td>
                <td className="py-2.5 pr-3">
                  <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full border text-sm font-bold ${GRADE_CLASSES[r.grade]}`}>
                    {r.grade}
                  </span>
                </td>
                <td className="py-2.5 text-silver min-w-[320px]">{r.finding}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Final Recommendation */}
      <div className="card">
        <div className="flex items-center gap-3 mb-3">
          <h2 className="font-semibold">Final Recommendation</h2>
          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${VERDICT_CLASSES[recommendation.verdict]}`}>
            {recommendation.verdict}
          </span>
        </div>
        <p className="text-sm text-white leading-relaxed mb-4">{recommendation.rationale}</p>
        <div className="label mb-2">Suggested LOI Adjustments</div>
        <ul className="space-y-1.5">
          {recommendation.loiAdjustments.map((a, i) => (
            <li key={i} className="text-sm text-silver flex gap-2">
              <span className="text-gold">→</span>
              <span>{a}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Supporting metric detail */}
      <div className="card">
        <h2 className="font-semibold mb-4">Supporting Metrics</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {metrics.map((m) => (
            <div key={m.label} className={`border rounded-lg p-3 ${COLOR_CLASSES[m.color]}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className={`w-2.5 h-2.5 rounded-full ${DOT_CLASSES[m.color]}`} />
                <span className="text-xs font-medium uppercase tracking-wide">{m.label}</span>
              </div>
              <div className="text-lg font-bold">{m.value}</div>
              <div className="text-xs opacity-80 mt-0.5">{m.detail}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
