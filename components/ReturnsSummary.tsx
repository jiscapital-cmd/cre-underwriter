"use client";

import { ReturnsSummary as ReturnsType } from "@/lib/underwriting";
import { fmtPct, fmtUsd, fmtX } from "@/lib/format";

export default function ReturnsSummaryPanel({ returns }: { returns: ReturnsType }) {
  const stats = [
    { label: "Levered IRR", value: fmtPct(returns.leveredIRR) },
    { label: "Equity Multiple", value: fmtX(returns.equityMultiple) },
    { label: "Year 1 Cash-on-Cash", value: fmtPct(returns.yearOneCoC) },
    { label: "Avg Cash-on-Cash", value: fmtPct(returns.avgCashOnCash) },
    { label: "Unlevered IRR", value: fmtPct(returns.unleveredIRR) },
    { label: "Going-In Cap Rate", value: fmtPct(returns.goingInCapRate) },
    { label: "Year 1 DSCR", value: `${returns.yearOneDSCR.toFixed(2)}x` },
    { label: "Equity Required", value: fmtUsd(returns.equityInvested) },
  ];

  return (
    <div className="card">
      <h2 className="font-semibold mb-4">Returns Summary</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label}>
            <div className="label">{s.label}</div>
            <div className="stat-value">{s.value}</div>
          </div>
        ))}
      </div>
      <div className="mt-5 pt-4 border-t border-cardBorder grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
        <div>
          <div className="label">Exit Value</div>
          <div className="font-medium">{fmtUsd(returns.exitValue)}</div>
        </div>
        <div>
          <div className="label">Sale Costs</div>
          <div className="font-medium">{fmtUsd(returns.saleCosts)}</div>
        </div>
        <div>
          <div className="label">Net Sale Proceeds</div>
          <div className="font-medium">{fmtUsd(returns.netSaleProceeds)}</div>
        </div>
      </div>
    </div>
  );
}
