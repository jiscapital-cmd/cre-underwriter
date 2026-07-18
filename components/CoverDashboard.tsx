"use client";

import { DealInputs, OfferScenario, ReturnsSummary, offerPrice } from "@/lib/underwriting";
import { ScorecardMetric, investmentThesis } from "@/lib/scorecard";
import { WaterfallResult } from "@/lib/waterfall";
import { fmtPct, fmtUsd, fmtX } from "@/lib/format";
import NumberField from "./NumberField";

const SCENARIOS: OfferScenario[] = ["Conservative", "Base", "Aggressive"];

export default function CoverDashboard({
  inputs,
  onChange,
  returns,
  scorecard,
  waterfall,
}: {
  inputs: DealInputs;
  onChange: (patch: Partial<DealInputs>) => void;
  returns: ReturnsSummary;
  scorecard: ScorecardMetric[];
  waterfall: WaterfallResult;
}) {
  const thesis = investmentThesis(inputs, returns, scorecard);
  const verdict = thesis.includes("PASS") ? "PASS" : thesis.includes("MONITOR") ? "MONITOR" : "PROCEED";
  const verdictColor =
    verdict === "PROCEED" ? "bg-emerald-500/15 text-emerald-300" : verdict === "MONITOR" ? "bg-amber-500/15 text-amber-300" : "bg-red-500/15 text-red-300";
  const greens = scorecard.filter((m) => m.color === "green").length;
  const confidence = Math.round((greens / scorecard.length) * 100);

  const stats = [
    { label: "Offer Price / Unit", value: fmtUsd(offerPrice(inputs) / inputs.unitCount) },
    { label: "Going-In Cap Rate", value: fmtPct(returns.goingInCapRate) },
    { label: "Year 1 Cash-on-Cash", value: fmtPct(returns.yearOneCoC) },
    { label: "Levered IRR", value: fmtPct(returns.leveredIRR) },
    { label: "Equity Multiple", value: fmtX(returns.equityMultiple) },
    { label: "Year 1 DSCR", value: `${returns.yearOneDSCR.toFixed(2)}x` },
  ];

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
          <div>
            <h1 className="text-xl font-bold">{inputs.propertyName}</h1>
            <p className="text-sm text-silver">
              {inputs.unitCount}-unit {inputs.assetType} · {inputs.holdPeriodYears}-yr hold ·{" "}
              {fmtUsd(offerPrice(inputs))} offer price
            </p>
          </div>
          <div className={`px-4 py-2 rounded-lg font-semibold ${verdictColor}`}>
            {verdict} · {confidence}% confidence
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-5">
          {stats.map((s) => (
            <div key={s.label}>
              <div className="label">{s.label}</div>
              <div className="stat-value">{s.value}</div>
            </div>
          ))}
        </div>

        <p className="text-sm text-white leading-relaxed border-t border-cardBorder pt-4">{thesis}</p>
      </div>

      <div className="card">
        <h2 className="font-semibold mb-3">Offer Posture</h2>
        <div className="flex gap-2 mb-4">
          {SCENARIOS.map((s) => (
            <button
              key={s}
              onClick={() => onChange({ offerScenario: s })}
              className={`px-4 py-2 rounded-md text-sm font-medium border ${
                inputs.offerScenario === s
                  ? "bg-ink text-navy font-semibold border-ink"
                  : "bg-card text-silver border-cardBorder hover:border-ink/40"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <p className="text-sm text-silver">
          Offer price at this posture: <span className="font-medium text-ink">{fmtUsd(offerPrice(inputs))}</span> (
          {fmtPct(1 - offerPrice(inputs) / inputs.purchasePrice)} below asking of {fmtUsd(inputs.purchasePrice)})
        </p>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">GP/LP Waterfall Summary</h2>
          <span className="text-xs text-silver">Full detail on the Waterfall tab</span>
        </div>
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
        </div>
        <p className="text-sm text-silver mt-3">
          {(inputs.preferredReturnPct * 100).toFixed(1)}% preferred return, {(inputs.catchUpGPSharePct * 100).toFixed(0)}/
          {(100 - inputs.catchUpGPSharePct * 100).toFixed(0)} catch-up, {(100 - inputs.residualGPSplitPct * 100).toFixed(0)}/
          {(inputs.residualGPSplitPct * 100).toFixed(0)} residual split. Total promote to GP:{" "}
          <span className="font-medium text-gold">{fmtUsd(waterfall.totalPromoteToGP)}</span>.
        </p>
      </div>

      <div className="card">
        <h2 className="font-semibold mb-4">LOI Terms</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <NumberField label="Earnest Money Deposit" percent value={inputs.emDepositPct} onChange={(v) => onChange({ emDepositPct: v })} />
          <NumberField label="Due Diligence Period (days)" value={inputs.ddPeriodDays} onChange={(v) => onChange({ ddPeriodDays: v })} />
          <NumberField label="Financing Contingency (days)" value={inputs.financingContingencyDays} onChange={(v) => onChange({ financingContingencyDays: v })} />
          <NumberField label="Closing (days from acceptance)" value={inputs.closingDays} onChange={(v) => onChange({ closingDays: v })} />
          <NumberField label="Seller Concessions Requested" prefix="$" value={inputs.sellerConcessions} step={1000} onChange={(v) => onChange({ sellerConcessions: v })} />
          <div>
            <span className="label">Earnest Money ($)</span>
            <div className="mt-1 text-sm font-medium py-1.5">{fmtUsd(offerPrice(inputs) * inputs.emDepositPct)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
