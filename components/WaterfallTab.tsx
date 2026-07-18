"use client";

import { DealInputs } from "@/lib/underwriting";
import { WaterfallResult } from "@/lib/waterfall";
import { fmtPct, fmtUsd, fmtX } from "@/lib/format";
import NumberField from "./NumberField";

export default function WaterfallTab({
  inputs,
  onChange,
  waterfall,
}: {
  inputs: DealInputs;
  onChange: (patch: Partial<DealInputs>) => void;
  waterfall: WaterfallResult;
}) {
  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="font-semibold mb-4">Waterfall Assumptions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <NumberField
            label="Preferred Return (Hurdle)"
            percent
            value={inputs.preferredReturnPct}
            onChange={(v) => onChange({ preferredReturnPct: v })}
          />
          <NumberField
            label="GP Co-Invest (% of Equity)"
            percent
            value={inputs.gpCoInvestPct}
            onChange={(v) => onChange({ gpCoInvestPct: v })}
          />
          <NumberField
            label="GP Share During Catch-up"
            percent
            value={inputs.catchUpGPSharePct}
            onChange={(v) => onChange({ catchUpGPSharePct: v })}
          />
          <NumberField
            label="GP Residual Split (Promote)"
            percent
            value={inputs.residualGPSplitPct}
            onChange={(v) => onChange({ residualGPSplitPct: v })}
          />
        </div>
        <p className="text-xs text-silver mt-3">
          Structure: 100% return of capital (pro-rata to contributed equity) → {(inputs.preferredReturnPct * 100).toFixed(1)}%
          preferred return → {(inputs.catchUpGPSharePct * 100).toFixed(0)}/{(100 - inputs.catchUpGPSharePct * 100).toFixed(0)}
          {" "}catch-up until GP reaches {(inputs.residualGPSplitPct * 100).toFixed(0)}% of cumulative profit → residual split{" "}
          {(100 - inputs.residualGPSplitPct * 100).toFixed(0)}/{(inputs.residualGPSplitPct * 100).toFixed(0)} LP/GP thereafter.
        </p>
      </div>

      <div className="card">
        <h2 className="font-semibold mb-4">Key Metrics</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <div className="label">LP IRR</div>
            <div className="stat-value">{fmtPct(waterfall.lpIRR)}</div>
          </div>
          <div>
            <div className="label">GP IRR</div>
            <div className="stat-value">{waterfall.gpEquity > 0 ? fmtPct(waterfall.gpIRR) : "—"}</div>
          </div>
          <div>
            <div className="label">LP Equity Multiple</div>
            <div className="stat-value">{fmtX(waterfall.lpEquityMultiple)}</div>
          </div>
          <div>
            <div className="label">GP Equity Multiple</div>
            <div className="stat-value">{waterfall.gpEquityMultiple !== null ? fmtX(waterfall.gpEquityMultiple) : "—"}</div>
          </div>
          <div>
            <div className="label">LP Equity Invested</div>
            <div className="font-medium">{fmtUsd(waterfall.lpEquity)}</div>
          </div>
          <div>
            <div className="label">GP Equity Invested</div>
            <div className="font-medium">{fmtUsd(waterfall.gpEquity)}</div>
          </div>
          <div>
            <div className="label">Total Promote to GP</div>
            <div className="font-medium">{fmtUsd(waterfall.totalPromoteToGP)}</div>
          </div>
          <div>
            <div className="label">Promote % of GP Total Distributions</div>
            <div className="font-medium">
              {waterfall.gpTotalDistributions > 0 ? fmtPct(waterfall.totalPromoteToGP / waterfall.gpTotalDistributions) : "—"}
            </div>
          </div>
        </div>
        {waterfall.gpEquity === 0 && (
          <p className="text-xs text-silver mt-3">
            GP IRR/Equity Multiple are undefined with $0 GP co-invest (pure sponsor promote) — set "GP Co-Invest" above 0%
            to model a GP capital contribution.
          </p>
        )}
      </div>

      <div className="card overflow-x-auto">
        <h2 className="font-semibold mb-1">Tiered Distribution Summary</h2>
        <p className="text-sm text-silver mb-4">Cumulative dollars distributed to each party by waterfall tier, over the full hold period.</p>
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left border-b border-cardBorder">
              <th className="py-2 pr-3 font-medium text-silver">Tier</th>
              <th className="py-2 pr-3 font-medium text-silver text-right">Hurdle</th>
              <th className="py-2 pr-3 font-medium text-silver text-right">LP Share</th>
              <th className="py-2 pr-3 font-medium text-silver text-right">GP Share</th>
              <th className="py-2 pr-3 font-medium text-silver text-right">LP Amount</th>
              <th className="py-2 font-medium text-silver text-right">GP Amount</th>
            </tr>
          </thead>
          <tbody>
            {waterfall.tiers.map((t) => (
              <tr key={t.tier} className="border-b border-cardBorder">
                <td className="py-2 pr-3">{t.tier}</td>
                <td className="py-2 pr-3 text-right tabular-nums text-silver">{t.hurdle}</td>
                <td className="py-2 pr-3 text-right tabular-nums text-gold">{fmtPct(t.lpSharePct, 0)}</td>
                <td className="py-2 pr-3 text-right tabular-nums text-gold">{fmtPct(t.gpSharePct, 0)}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{fmtUsd(t.lpAmount)}</td>
                <td className="py-2 text-right tabular-nums">{fmtUsd(t.gpAmount)}</td>
              </tr>
            ))}
            <tr className="font-semibold">
              <td className="py-2 pr-3" colSpan={4}>
                Total
              </td>
              <td className="py-2 pr-3 text-right tabular-nums">{fmtUsd(waterfall.lpTotalDistributions)}</td>
              <td className="py-2 text-right tabular-nums">{fmtUsd(waterfall.gpTotalDistributions)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="card overflow-x-auto">
        <h2 className="font-semibold mb-1">GP/LP Waterfall — By Year</h2>
        <p className="text-sm text-silver mb-4">Distribution flow year by year, with cumulative totals and the GP's promote share of each year's cash.</p>
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left border-b border-cardBorder">
              <th className="py-2 pr-3 font-medium text-silver">Year</th>
              <th className="py-2 pr-3 font-medium text-silver text-right">Total Cash Flow</th>
              <th className="py-2 pr-3 font-medium text-silver text-right">LP Distribution</th>
              <th className="py-2 pr-3 font-medium text-silver text-right">GP Distribution</th>
              <th className="py-2 pr-3 font-medium text-silver text-right">GP % of Cash</th>
              <th className="py-2 pr-3 font-medium text-silver text-right">LP Cumulative</th>
              <th className="py-2 font-medium text-silver text-right">GP Cumulative</th>
            </tr>
          </thead>
          <tbody>
            {waterfall.yearly.map((y) => (
              <tr key={y.year} className="border-b border-cardBorder">
                <td className="py-2 pr-3 font-medium">Year {y.year}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{fmtUsd(y.totalCashFlow)}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{fmtUsd(y.lpDistribution)}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{fmtUsd(y.gpDistribution)}</td>
                <td className="py-2 pr-3 text-right tabular-nums text-gold">{fmtPct(y.gpPromotePctOfCash, 0)}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{fmtUsd(y.lpCumulative)}</td>
                <td className="py-2 text-right tabular-nums">{fmtUsd(y.gpCumulative)}</td>
              </tr>
            ))}
            <tr className="font-semibold">
              <td className="py-2 pr-3">Total</td>
              <td className="py-2 pr-3 text-right tabular-nums">
                {fmtUsd(waterfall.yearly.reduce((s, y) => s + y.totalCashFlow, 0))}
              </td>
              <td className="py-2 pr-3 text-right tabular-nums">{fmtUsd(waterfall.lpTotalDistributions)}</td>
              <td className="py-2 pr-3 text-right tabular-nums">{fmtUsd(waterfall.gpTotalDistributions)}</td>
              <td className="py-2 pr-3 text-right tabular-nums text-gold">
                {fmtPct(
                  waterfall.gpTotalDistributions / (waterfall.lpTotalDistributions + waterfall.gpTotalDistributions),
                  0
                )}
              </td>
              <td className="py-2 pr-3 text-right tabular-nums">{fmtX(waterfall.lpEquityMultiple)}</td>
              <td className="py-2 text-right tabular-nums">
                {waterfall.gpEquityMultiple !== null ? fmtX(waterfall.gpEquityMultiple) : "—"}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
