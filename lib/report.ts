import { DealInputs, DebtSummary, ReturnsSummary, YearLine, SourcesAndUses, offerPrice } from "./underwriting";
import { TrueNetYieldModel, RiskRow, FinalRecommendation } from "./riskAnalysis";
import { WaterfallResult } from "./waterfall";
import { ScenarioResult, BreakEven } from "./scenarios";
import { MarketComps } from "./applyExtraction";
import { AssumptionRow } from "./assumptionsRegister";
import { fmtPct, fmtUsd, fmtX } from "./format";

// ---------------------------------------------------------------------------
// CapEx Reserve component breakdown + funding gap
// ---------------------------------------------------------------------------

export type CapexComponent = { label: string; pct: number; annualBudget: number; holdTotal: number };
export type CapexAnalysis = {
  components: CapexComponent[];
  budgetedPerUnit: number;
  recommendedPerUnit: number;
  gapPerUnit: number;
  gapTotal: number;
  underfunded: boolean;
};

const CAPEX_ALLOCATION: { label: string; pct: number }[] = [
  { label: "Roofing & Building Envelope", pct: 0.15 },
  { label: "HVAC Systems", pct: 0.2 },
  { label: "Plumbing", pct: 0.1 },
  { label: "Electrical", pct: 0.1 },
  { label: "Unit Interiors (Flooring, Appliances, Fixtures)", pct: 0.2 },
  { label: "Exterior, Parking & Common Areas", pct: 0.15 },
  { label: "Contingency", pct: 0.1 },
];

// Rule-of-thumb reserve benchmark for a value-add multifamily hold; not
// property-specific (no condition assessment data available in the model).
const RECOMMENDED_RESERVE_PER_UNIT = 350;

export function computeCapexAnalysis(inputs: DealInputs): CapexAnalysis {
  const annualBudget = inputs.capReservePerUnit * inputs.unitCount;
  const components: CapexComponent[] = CAPEX_ALLOCATION.map((c) => ({
    label: c.label,
    pct: c.pct,
    annualBudget: annualBudget * c.pct,
    holdTotal: annualBudget * c.pct * inputs.holdPeriodYears,
  }));

  const gapPerUnit = RECOMMENDED_RESERVE_PER_UNIT - inputs.capReservePerUnit;
  return {
    components,
    budgetedPerUnit: inputs.capReservePerUnit,
    recommendedPerUnit: RECOMMENDED_RESERVE_PER_UNIT,
    gapPerUnit,
    gapTotal: gapPerUnit * inputs.unitCount,
    underfunded: gapPerUnit > 0,
  };
}

// ---------------------------------------------------------------------------
// Full report assembly
// ---------------------------------------------------------------------------

export type ReportInputs = {
  inputs: DealInputs;
  debt: DebtSummary;
  proforma: YearLine[];
  returns: ReturnsSummary;
  sourcesAndUses: SourcesAndUses;
  yieldModel: TrueNetYieldModel;
  riskRows: RiskRow[];
  recommendation: FinalRecommendation;
  waterfall: WaterfallResult;
  scenarios: ScenarioResult[];
  breakEven: BreakEven;
  marketComps: MarketComps;
  assumptions: AssumptionRow[];
  thesis: string[];
  capex: CapexAnalysis;
}

function table(headers: string[], rows: (string | number)[][]): string {
  const head = `| ${headers.join(" | ")} |`;
  const sep = `| ${headers.map(() => "---").join(" | ")} |`;
  const body = rows.map((r) => `| ${r.join(" | ")} |`).join("\n");
  return `${head}\n${sep}\n${body}`;
}

export function buildFullReport(r: ReportInputs): string {
  const { inputs, debt, proforma, returns, sourcesAndUses, yieldModel, riskRows, recommendation, waterfall, scenarios, breakEven, marketComps, assumptions, thesis, capex } = r;
  const price = offerPrice(inputs);
  const today = new Date().toISOString().slice(0, 10);
  const overall = riskRows.find((row) => row.category === "Overall Deal Risk");

  const md: string[] = [];

  // ---- Cover Page ----
  md.push(`# ${inputs.propertyName}`);
  md.push(`## Full Underwriting Report`);
  md.push("");
  md.push(`**${inputs.unitCount}-unit ${inputs.assetType}**  `);
  md.push(`${[inputs.propertyAddress, inputs.propertyCity, inputs.propertyState].filter(Boolean).join(", ") || "Address not entered"}`);
  md.push("");
  md.push(`Prepared: ${today}  `);
  md.push(`Purchase Price: ${fmtUsd(price)}  (${fmtUsd(price / inputs.unitCount)}/unit)  `);
  md.push(`Recommendation: **${recommendation.verdict}**`);
  md.push("");
  md.push("---");
  md.push("");

  // ---- Table of Contents ----
  md.push(`## Table of Contents`);
  md.push("");
  const toc = [
    "Executive Summary",
    "Deal Overview",
    "True Net Yield Analysis",
    "Operating Proforma",
    "Debt & Financing Assumptions",
    "Return Waterfall",
    "Sensitivity & Scenarios",
    "Market & Comps Analysis",
    "Scorecard & Risk Analysis",
    "CapEx Reserve Analysis",
    "Assumptions Register",
    "Final Recommendation & LOI Terms",
  ];
  toc.forEach((t, i) => md.push(`${i + 1}. ${t}`));
  md.push("");
  md.push("---");
  md.push("");

  // ---- 1. Executive Summary ----
  md.push(`## 1. Executive Summary`);
  md.push("");
  md.push(
    table(
      ["Metric", "Value"],
      [
        ["Levered IRR", returns.leveredIRR !== null ? fmtPct(returns.leveredIRR) : "N/A"],
        ["Equity Multiple", fmtX(returns.equityMultiple)],
        ["Going-In Cap Rate", fmtPct(returns.goingInCapRate)],
        ["Year 1 Cash-on-Cash", fmtPct(returns.yearOneCoC)],
        ["Year 1 DSCR", `${returns.yearOneDSCR.toFixed(2)}x`],
        ["Recommendation", recommendation.verdict],
      ]
    )
  );
  md.push("");
  md.push(`**Business Plan.** ${thesis[0]}`);
  md.push("");
  md.push(thesis[2]);
  md.push("");

  // ---- 2. Deal Overview ----
  md.push(`## 2. Deal Overview`);
  md.push("");
  md.push(
    table(
      ["Item", "Detail"],
      [
        ["Property", inputs.propertyName],
        ["Asset Type", inputs.assetType],
        ["Units", String(inputs.unitCount)],
        ["Purchase Price", fmtUsd(inputs.purchasePrice)],
        ["Offer Price", fmtUsd(price)],
        ["Price / Unit", fmtUsd(price / inputs.unitCount)],
        ["Hold Period", `${inputs.holdPeriodYears} years`],
        ["Exit Cap Rate", fmtPct(inputs.exitCapRate)],
      ]
    )
  );
  md.push("");
  md.push(`### Sources & Uses`);
  md.push("");
  md.push(
    table(
      ["Sources", "Amount", "Uses", "Amount"],
      Array.from({ length: Math.max(sourcesAndUses.sources.length, sourcesAndUses.uses.length) }, (_, i) => [
        sourcesAndUses.sources[i]?.label ?? "",
        sourcesAndUses.sources[i] ? fmtUsd(sourcesAndUses.sources[i].amount) : "",
        sourcesAndUses.uses[i]?.label ?? "",
        sourcesAndUses.uses[i] ? fmtUsd(sourcesAndUses.uses[i].amount) : "",
      ])
    )
  );
  md.push("");
  md.push(`**Total Sources:** ${fmtUsd(sourcesAndUses.totalSources)}  |  **Total Uses:** ${fmtUsd(sourcesAndUses.totalUses)}`);
  md.push("");

  // ---- 3. True Net Yield Analysis ----
  md.push(`## 3. True Net Yield Analysis`);
  md.push("");
  md.push(
    table(
      ["Line Item", "Annual $", "Yield Impact", "Running Yield"],
      yieldModel.rows.map((row, i) => [
        row.label,
        fmtUsd(row.annual),
        i === 0 ? "—" : `${row.pctOfPrice >= 0 ? "+" : ""}${(row.pctOfPrice * 100).toFixed(2)} pts`,
        fmtPct(row.runningYield, 2),
      ])
    )
  );
  md.push("");
  md.push(
    `**Advertised Yield:** ${fmtPct(yieldModel.advertisedYield, 2)}  |  **True Net Yield:** ${fmtPct(yieldModel.trueNetYield, 2)}  |  **Delta:** -${(yieldModel.deltaPoints * 100).toFixed(2)} pts (${fmtPct(yieldModel.pctReduction, 0)} reduction)`
  );
  md.push("");

  // ---- 4. Operating Proforma ----
  md.push(`## 4. Operating Proforma (5-Year Summary)`);
  md.push("");
  const years = proforma.slice(0, 5);
  md.push(
    table(
      ["Line Item", ...years.map((y) => `Year ${y.year}`)],
      [
        ["Gross Potential Rent", ...years.map((y) => fmtUsd(y.gpr))],
        ["Vacancy & Credit Loss", ...years.map((y) => fmtUsd(y.vacancyLoss))],
        ["Other Income", ...years.map((y) => fmtUsd(y.otherIncome))],
        ["Effective Gross Income", ...years.map((y) => fmtUsd(y.egi))],
        ["Operating Expenses", ...years.map((y) => fmtUsd(y.opex))],
        ["Management Fee", ...years.map((y) => fmtUsd(y.managementFee))],
        ["Net Operating Income", ...years.map((y) => fmtUsd(y.noi))],
        ["Debt Service", ...years.map((y) => fmtUsd(y.debtService))],
        ["Levered Cash Flow", ...years.map((y) => fmtUsd(y.leveredCF))],
      ]
    )
  );
  md.push("");

  // ---- 5. Debt & Financing ----
  md.push(`## 5. Debt & Financing Assumptions`);
  md.push("");
  md.push(
    table(
      ["Item", "Value"],
      [
        ["Loan Amount", fmtUsd(debt.loanAmount)],
        ["LTV", fmtPct(inputs.ltv, 0)],
        ["Interest Rate", fmtPct(inputs.interestRate, 2)],
        ["Amortization", `${inputs.amortYears} years`],
        ["Interest-Only Period", `${inputs.ioYears} years`],
        ["Loan Fees", fmtUsd(debt.loanFees)],
        ["Year 1 Annual Debt Service", fmtUsd(proforma[0]?.debtService ?? 0)],
        ["Year 1 DSCR", `${returns.yearOneDSCR.toFixed(2)}x`],
        ["Equity Required", fmtUsd(debt.equityRequired)],
      ]
    )
  );
  md.push("");

  // ---- 6. Return Waterfall ----
  md.push(`## 6. Return Waterfall (GP/LP)`);
  md.push("");
  md.push(
    table(
      ["Tier", "LP Share", "GP Share", "LP Amount", "GP Amount"],
      waterfall.tiers.map((t) => [t.tier, fmtPct(t.lpSharePct, 0), fmtPct(t.gpSharePct, 0), fmtUsd(t.lpAmount), fmtUsd(t.gpAmount)])
    )
  );
  md.push("");
  md.push(
    table(
      ["Metric", "LP", "GP"],
      [
        ["Equity Invested", fmtUsd(waterfall.lpEquity), fmtUsd(waterfall.gpEquity)],
        ["Total Distributions", fmtUsd(waterfall.lpTotalDistributions), fmtUsd(waterfall.gpTotalDistributions)],
        ["IRR", waterfall.lpIRR !== null ? fmtPct(waterfall.lpIRR) : "N/A", waterfall.gpIRR !== null ? fmtPct(waterfall.gpIRR) : "N/A (no co-invest)"],
        ["Equity Multiple", fmtX(waterfall.lpEquityMultiple), waterfall.gpEquityMultiple !== null ? fmtX(waterfall.gpEquityMultiple) : "N/A"],
      ]
    )
  );
  md.push("");

  // ---- 7. Sensitivity & Scenarios ----
  md.push(`## 7. Sensitivity & Scenarios`);
  md.push("");
  md.push(
    table(
      ["Scenario", "Levered IRR", "Equity Multiple", "Year 1 CoC", "Exit Value"],
      scenarios.map((s) => [
        s.name,
        s.returns.leveredIRR !== null ? fmtPct(s.returns.leveredIRR) : "N/A",
        fmtX(s.returns.equityMultiple),
        fmtPct(s.returns.yearOneCoC),
        fmtUsd(s.returns.exitValue),
      ])
    )
  );
  md.push("");
  md.push(
    `**Break-Even Occupancy:** ${fmtPct(breakEven.breakEvenOccupancyPct)}  |  **Break-Even Rent/Unit/Mo:** ${fmtUsd(breakEven.breakEvenRentPerUnitMonthly)}  |  **Margin of Safety:** ${breakEven.marginOfSafetyOccPts.toFixed(1)} pts`
  );
  md.push("");

  // ---- 8. Market & Comps ----
  md.push(`## 8. Market & Comps Analysis`);
  md.push("");
  if (marketComps.salesComps.length > 0) {
    md.push(`### Sales Comps`);
    md.push("");
    md.push(
      table(
        ["Property", "Units", "Sale Price", "$/Unit", "Cap Rate", "Sale Date"],
        marketComps.salesComps.map((c) => [c.property, String(c.units), fmtUsd(c.salePrice), fmtUsd(c.pricePerUnit), fmtPct(c.capRate), c.saleDate])
      )
    );
    md.push("");
  }
  if (marketComps.rentComps.length > 0) {
    md.push(`### Rent Comps`);
    md.push("");
    md.push(
      table(
        ["Property", "Unit Type", "Avg SF", "Asking Rent", "$/SF"],
        marketComps.rentComps.map((c) => [c.property, c.unitType, String(c.avgSF), fmtUsd(c.askingRent), `$${c.rentPerSF.toFixed(2)}`])
      )
    );
    md.push("");
  }
  if (marketComps.salesComps.length === 0 && marketComps.rentComps.length === 0) {
    md.push(`*No sales or rent comps entered. Price/unit and rent growth assumptions are currently unverified against the submarket — see Risk Scorecard, Market & Location Fundamentals.*`);
    md.push("");
  }

  // ---- 9. Scorecard & Risk Analysis ----
  md.push(`## 9. Scorecard & Risk Analysis`);
  md.push("");
  md.push(
    table(
      ["Risk Category", "Grade", "Key Finding"],
      riskRows.map((row) => [row.category, row.grade, row.finding])
    )
  );
  md.push("");
  md.push(`**Overall Deal Risk: ${overall?.grade ?? "—"}**`);
  md.push("");

  // ---- 10. CapEx Reserve Analysis ----
  md.push(`## 10. CapEx Reserve Analysis`);
  md.push("");
  md.push(
    table(
      ["Component", "% Allocation", "Annual Budget", `${inputs.holdPeriodYears}-Year Total`],
      capex.components.map((c) => [c.label, fmtPct(c.pct, 0), fmtUsd(c.annualBudget), fmtUsd(c.holdTotal)])
    )
  );
  md.push("");
  md.push(
    table(
      ["", "Per Unit / Year"],
      [
        ["Budgeted Reserve", fmtUsd(capex.budgetedPerUnit)],
        ["Recommended Reserve (Benchmark)", fmtUsd(capex.recommendedPerUnit)],
        ["Funding Gap", `${capex.gapPerUnit >= 0 ? "-" : "+"}${fmtUsd(Math.abs(capex.gapPerUnit))}/unit`],
      ]
    )
  );
  md.push("");
  md.push(
    capex.underfunded
      ? `**Funding gap of ${fmtUsd(capex.gapTotal)} total** versus the recommended benchmark reserve — confirm scope against a third-party Property Condition Assessment before DD expires.`
      : `Reserve is at or above the recommended benchmark — adequate under standard underwriting assumptions.`
  );
  md.push("");

  // ---- 11. Assumptions Register ----
  md.push(`## 11. Assumptions Register`);
  md.push("");
  md.push(
    table(
      ["Category", "Assumption", "Value", "Source", "Confidence"],
      assumptions.map((a) => [a.category, a.assumption, a.value, a.source, a.confidence])
    )
  );
  md.push("");

  // ---- 12. Final Recommendation & LOI Terms ----
  md.push(`## 12. Final Recommendation & LOI Terms`);
  md.push("");
  md.push(`### Recommendation: ${recommendation.verdict}`);
  md.push("");
  md.push(recommendation.rationale);
  md.push("");
  md.push(`### Suggested LOI Adjustments`);
  md.push("");
  recommendation.loiAdjustments.forEach((a) => md.push(`- ${a}`));
  md.push("");
  md.push(`### Key LOI Terms`);
  md.push("");
  md.push(
    table(
      ["Term", "Value"],
      [
        ["Purchase Price", fmtUsd(price)],
        ["Earnest Money Deposit", `${fmtUsd(price * inputs.emDepositPct)} (${fmtPct(inputs.emDepositPct)})`],
        ["Due Diligence Period", `${inputs.ddPeriodDays} days`],
        ["Financing Contingency", `${inputs.financingContingencyDays} days`],
        ["Closing", `${inputs.closingDays} days after DD expiration`],
        ["Seller Concessions Requested", inputs.sellerConcessions > 0 ? fmtUsd(inputs.sellerConcessions) : "None"],
      ]
    )
  );
  md.push("");
  md.push("---");
  md.push("");
  md.push(`*This report is generated from the current underwriting model and is intended for internal analysis. Verify all figures against source documents before submitting an offer.*`);

  return md.join("\n");
}
