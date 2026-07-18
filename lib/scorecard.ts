import { DealInputs, DebtSummary, ReturnsSummary, YearLine, offerPrice } from "./underwriting";

export type ScoreColor = "green" | "yellow" | "red";
export type ScorecardMetric = {
  label: string;
  value: string;
  color: ScoreColor;
  detail: string;
};

export type Risk = {
  title: string;
  impact: string; // quantified $ or % impact
  mitigation: string;
  severity: ScoreColor;
};

function grade(value: number, greenIf: (v: number) => boolean, yellowIf: (v: number) => boolean): ScoreColor {
  if (greenIf(value)) return "green";
  if (yellowIf(value)) return "yellow";
  return "red";
}

export function buildScorecard(
  inputs: DealInputs,
  debt: DebtSummary,
  returns: ReturnsSummary,
  proforma: YearLine[]
): ScorecardMetric[] {
  const pricePerUnit = offerPrice(inputs) / inputs.unitCount;
  const dscr = returns.yearOneDSCR;
  const debtYield = proforma[0].noi / debt.loanAmount;
  const breakEvenOccPct = (proforma[0].opex + proforma[0].managementFee + proforma[0].debtService) / inputs.marketGPRAnnual;

  const metrics: ScorecardMetric[] = [
    {
      label: "Levered IRR",
      value: returns.leveredIRR !== null ? `${(returns.leveredIRR * 100).toFixed(1)}%` : "N/A",
      color: returns.leveredIRR === null
        ? "red"
        : grade(returns.leveredIRR, (v) => v >= 0.15, (v) => v >= 0.1),
      detail: "Target ≥15% green, ≥10% yellow",
    },
    {
      label: "Equity Multiple",
      value: `${returns.equityMultiple.toFixed(2)}x`,
      color: grade(returns.equityMultiple, (v) => v >= 1.8, (v) => v >= 1.5),
      detail: "Target ≥1.8x green, ≥1.5x yellow",
    },
    {
      label: "Year 1 Cash-on-Cash",
      value: `${(returns.yearOneCoC * 100).toFixed(1)}%`,
      color: grade(returns.yearOneCoC, (v) => v >= 0.06, (v) => v >= 0.03),
      detail: "Target ≥6% green, ≥3% yellow",
    },
    {
      label: "Year 1 DSCR",
      value: `${dscr.toFixed(2)}x`,
      color: grade(dscr, (v) => v >= 1.35, (v) => v >= 1.2),
      detail: "Lender min typically 1.20-1.25x",
    },
    {
      label: "Debt Yield",
      value: `${(debtYield * 100).toFixed(1)}%`,
      color: grade(debtYield, (v) => v >= 0.09, (v) => v >= 0.07),
      detail: "Target ≥9% green, ≥7% yellow",
    },
    {
      label: "Going-In Cap Rate",
      value: `${(returns.goingInCapRate * 100).toFixed(2)}%`,
      color: grade(returns.goingInCapRate, (v) => v >= 0.06, (v) => v >= 0.05),
      detail: "Relative to exit cap and market comps",
    },
    {
      label: "Cap Rate Spread (Going-In minus Exit)",
      value: `${((returns.goingInCapRate - inputs.exitCapRate) * 100).toFixed(2)} pts`,
      color: grade(returns.goingInCapRate - inputs.exitCapRate, (v) => v >= 0.003, (v) => v >= -0.002),
      detail: "Positive spread = cushion against cap rate expansion",
    },
    {
      label: "Price / Unit",
      value: pricePerUnit.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }),
      color: "yellow",
      detail: "Compare against submarket comps (Market & Comps tab)",
    },
    {
      label: "Breakeven Occupancy",
      value: `${(breakEvenOccPct * 100).toFixed(1)}%`,
      color: grade(1 - breakEvenOccPct, (v) => v >= 0.2, (v) => v >= 0.1),
      detail: "Lower is safer; flags thin margin for error",
    },
    {
      label: "LTV",
      value: `${(inputs.ltv * 100).toFixed(0)}%`,
      color: grade(inputs.ltv, (v) => v <= 0.65, (v) => v <= 0.75),
      detail: "Leverage risk — lower is more conservative",
    },
    {
      label: "Hold Period",
      value: `${inputs.holdPeriodYears} yrs`,
      color: "yellow",
      detail: "Longer holds increase exposure to cap rate/market cycle risk",
    },
    {
      label: "Vacancy Assumption",
      value: `${(inputs.vacancyRate * 100).toFixed(1)}%`,
      color: grade(0.1 - inputs.vacancyRate, (v) => v >= 0.03, (v) => v >= 0),
      detail: "Underwriting vacancy vs. typical stabilized 5-7%",
    },
  ];

  return metrics;
}

export function buildTopRisks(inputs: DealInputs, debt: DebtSummary, returns: ReturnsSummary, proforma: YearLine[]): Risk[] {
  const exitValueAt100bpsHigherCap = proforma[inputs.holdPeriodYears - 1].noi * (1 + inputs.rentGrowthRate) / (inputs.exitCapRate + 0.01);
  const exitValueImpact = returns.exitValue - exitValueAt100bpsHigherCap;

  const dscrCushion = returns.yearOneDSCR - 1.2;
  const rateShockDS = debt.loanAmount * 0.01; // +100bps on IO-equivalent basis
  const rateShockDSCR = proforma[0].noi / (debt.annualDebtServiceIO + rateShockDS);

  const rentGrowthShortfallNOI = proforma[inputs.holdPeriodYears - 1].noi - proforma[0].noi * Math.pow(1.01, inputs.holdPeriodYears - 1);

  const risks: Risk[] = [
    {
      title: "Exit cap rate expansion",
      impact: `A +100bps exit cap shift reduces exit value by ~${exitValueImpact.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })}`,
      mitigation: "Underwrite exit cap ≥ going-in cap; stress-test in Sensitivity tab before committing to offer price.",
      severity: exitValueImpact > returns.equityInvested * 0.3 ? "red" : "yellow",
    },
    {
      title: "Interest rate risk on refinance / floating debt",
      impact: `+100bps on debt service drops DSCR to ~${rateShockDSCR.toFixed(2)}x`,
      mitigation: "Consider rate cap (if bridge/floating), lock agency debt early, or size debt to 1.35x+ DSCR cushion.",
      severity: rateShockDSCR < 1.1 ? "red" : rateShockDSCR < 1.25 ? "yellow" : "green",
    },
    {
      title: "Rent growth underperformance",
      impact: `If rent growth runs 200bps below plan, Year ${inputs.holdPeriodYears} NOI could come in materially below budget (directional, see Scenario tab for Worst Case)`,
      mitigation: "Validate rent comps independently; phase renovation capex to actual lease-up pace, not pro forma pace.",
      severity: "yellow",
    },
    {
      title: "Break-even occupancy / thin operating margin",
      impact: `Property must maintain occupancy above breakeven threshold shown in Scorecard to cover debt service`,
      mitigation: "Maintain minimum 3-6 months debt service reserve; confirm historical occupancy trend in T-12 supports cushion.",
      severity: dscrCushion < 0.1 ? "red" : dscrCushion < 0.25 ? "yellow" : "green",
    },
    {
      title: "Deferred maintenance / capex overrun",
      impact: `Cap reserve budgeted at $${inputs.capReservePerUnit}/unit/yr ($${(inputs.capReservePerUnit * inputs.unitCount).toLocaleString()}/yr) — actual turn costs on value-add units often exceed budget`,
      mitigation: "Confirm scope with a third-party property condition assessment before DD period expires.",
      severity: "yellow",
    },
  ];

  return risks;
}

export function investmentThesis(inputs: DealInputs, returns: ReturnsSummary, metrics: ScorecardMetric[]): string {
  const greens = metrics.filter((m) => m.color === "green").length;
  const reds = metrics.filter((m) => m.color === "red").length;
  const irrTxt = returns.leveredIRR !== null ? `${(returns.leveredIRR * 100).toFixed(1)}%` : "not calculable (check inputs)";

  let verdict: string;
  if (reds >= 3) verdict = "PASS — multiple red-flag metrics suggest the deal does not clear underwriting thresholds at the current offer price.";
  else if (reds >= 1 || metrics.filter((m) => m.color === "yellow").length >= 5) verdict = "MONITOR — deal is workable but hinges on assumptions that should be tightened during DD before committing.";
  else verdict = "PROCEED — metrics clear standard underwriting thresholds; recommend submitting LOI and advancing to DD.";

  return `${inputs.propertyName} is a ${inputs.unitCount}-unit ${inputs.assetType.toLowerCase()} asset underwritten at a ${(offerPrice(inputs) / inputs.unitCount).toLocaleString(
    "en-US",
    { style: "currency", currency: "USD", maximumFractionDigits: 0 }
  )}/unit basis. At the modeled offer, the deal produces a ${irrTxt} levered IRR and ${returns.equityMultiple.toFixed(2)}x equity multiple over a ${inputs.holdPeriodYears}-year hold, with ${greens} of ${metrics.length} scorecard metrics in the green zone and ${reds} flagged red. Recommendation: ${verdict}`;
}
