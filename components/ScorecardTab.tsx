"use client";

import { ScorecardMetric, Risk, ScoreColor } from "@/lib/scorecard";

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

export default function ScorecardTab({ metrics, risks, thesis }: { metrics: ScorecardMetric[]; risks: Risk[]; thesis: string }) {
  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="font-semibold mb-4">Deal Scorecard</h2>
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

      <div className="card">
        <h2 className="font-semibold mb-4">Top 5 Risks</h2>
        <div className="space-y-3">
          {risks.map((r) => (
            <div key={r.title} className="border border-cardBorder rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className={`w-2.5 h-2.5 rounded-full ${DOT_CLASSES[r.severity]}`} />
                <span className="font-medium text-sm">{r.title}</span>
              </div>
              <p className="text-sm text-silver mb-1">{r.impact}</p>
              <p className="text-sm text-silver italic">Mitigation: {r.mitigation}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h2 className="font-semibold mb-2">Investment Thesis (auto-generated)</h2>
        <p className="text-sm text-white leading-relaxed">{thesis}</p>
      </div>
    </div>
  );
}
