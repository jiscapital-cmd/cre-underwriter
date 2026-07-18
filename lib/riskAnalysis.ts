import { DealInputs, DebtSummary, ReturnsSummary, offerPrice } from "./underwriting";
import { computeDetailedProforma } from "./detailedProforma";
import { MarketComps } from "./applyExtraction";
import { fmtPct, fmtUsd, fmtX } from "./format";

// ---------------------------------------------------------------------------
// 1. Investment Thesis
// ---------------------------------------------------------------------------

export function buildInvestmentThesis(
  inputs: DealInputs,
  debt: DebtSummary,
  returns: ReturnsSummary,
  noiYear1: number
): string[] {
  const price = offerPrice(inputs);
  const pricePerUnit = price / inputs.unitCount;
  const irr = returns.leveredIRR;
  const irrTxt = irr !== null ? fmtPct(irr) : "not calculable at current inputs";
  const y1 = inputs.year1Detail;
  const lossToLeaseTxt = y1.lossToLeasePct > 0 ? fmtPct(y1.lossToLeasePct) : null;

  const p1 = `${inputs.propertyName} is a ${inputs.unitCount}-unit ${inputs.assetType.toLowerCase()} acquisition underwritten at ${fmtUsd(price)} (${fmtUsd(pricePerUnit)}/unit), a ${fmtPct(returns.goingInCapRate)} going-in capitalization rate against Year 1 net operating income of ${fmtUsd(noiYear1)}. At this basis, the model projects a ${irrTxt} levered IRR and ${fmtX(returns.equityMultiple)} equity multiple over a ${inputs.holdPeriodYears}-year hold — returns that stand up to institutional underwriting only if the operating assumptions below survive diligence.`;

  const p2 = lossToLeaseTxt
    ? `The market opportunity centers on closing a ${lossToLeaseTxt} loss-to-lease gap between in-place and market rent, consistent with a submarket where rents have room to reprice toward stabilized comparables. Underwritten rent growth of ${fmtPct(inputs.rentGrowthRate)} annually is modest relative to that mark-to-market opportunity, and is treated here as a base-case assumption rather than the primary return driver — the thesis should not depend on continued outsized rent growth to work.`
    : `The market opportunity rests on ${fmtPct(inputs.rentGrowthRate)} annual rent growth and stabilized occupancy in the ${fmtPct(1 - inputs.vacancyRate, 1)} range, in line with typical class-appropriate multifamily performance rather than an aggressive re-tenanting story. Absent a stated loss-to-lease bridge, the underwriting should be treated as a stabilized hold rather than a heavy value-add repositioning.`;

  const capexAnnual = inputs.capReservePerUnit * inputs.unitCount;
  const p3 = `The value-add plan is funded through a ${fmtUsd(inputs.capReservePerUnit)}/unit annual capital reserve (${fmtUsd(capexAnnual)}/year), layered against ${fmtPct(inputs.expenseGrowthRate)} annual expense growth and a ${fmtPct(y1.managementFeePct)} management fee. Execution risk is concentrated in whether that reserve is sufficient to fund unit turns and common-area improvements on the timeline assumed — see the CapEx Reserve Adequacy grade below — and in whether trailing operating expenses (once a T-12 is loaded) confirm the Year 1 pro forma basis rather than requiring a markup.`;

  const p4 = `Return expectations are levered off ${fmtPct(inputs.ltv)} LTV debt at ${fmtPct(inputs.interestRate, 2)}, producing a Year 1 DSCR of ${returns.yearOneDSCR.toFixed(2)}x and a Year 1 cash-on-cash of ${fmtPct(returns.yearOneCoC)}. Exit is underwritten at a ${fmtPct(inputs.exitCapRate)} cap rate — a ${((returns.goingInCapRate - inputs.exitCapRate) * 100).toFixed(2)}-point spread off the going-in basis — with net sale proceeds of ${fmtUsd(returns.netSaleProceeds)} against ${fmtUsd(returns.equityInvested)} of invested equity.`;

  const p5 = `On a risk-adjusted basis, this deal is best characterized as ${
    irr !== null && irr >= 0.15 && returns.yearOneDSCR >= 1.25
      ? "underwritten with reasonable cushion, assuming the operating basis and exit cap hold up to independent verification"
      : "dependent on several assumptions holding simultaneously — going-in NOI, exit cap discipline, and debt terms — with limited room for multiple variables to move against the deal at once"
  }. The recommendation below should be read alongside the Risk Scorecard, which grades the specific line items — market fundamentals, exit liquidity, operator execution, and financing — that this thesis assumes will hold.`;

  return [p1, p2, p3, p4, p5];
}

// ---------------------------------------------------------------------------
// 2. True Net Yield Analysis
// ---------------------------------------------------------------------------

export type YieldRow = {
  label: string;
  annual: number; // positive = adds to yield, negative = subtracts
  pctOfPrice: number; // signed, in decimal (e.g. -0.012 = -1.2 pts)
  runningYield: number; // cumulative yield after this row, decimal
};

export type TrueNetYieldModel = {
  rows: YieldRow[];
  advertisedYield: number;
  trueNetYield: number;
  deltaPoints: number; // advertised - true, in decimal points
  pctReduction: number; // deltaPoints / advertisedYield
};

export function computeTrueNetYieldModel(inputs: DealInputs): TrueNetYieldModel {
  const price = offerPrice(inputs);
  const units = inputs.unitCount;
  const d = computeDetailedProforma(inputs.year1Detail, units);

  const pct = (amount: number) => (price > 0 ? amount / price : 0);

  const rows: YieldRow[] = [];
  let running = 0;

  function push(label: string, amount: number) {
    running += pct(amount);
    rows.push({ label, annual: amount, pctOfPrice: pct(amount), runningYield: running });
  }

  // Advertised: naive gross-rent yield, the number a broker headline is
  // usually implicitly built from before any frictions are netted out.
  push("Gross Potential Rent Yield (Advertised Basis)", d.gpr);
  const advertisedYield = running;

  push("Less: Vacancy, Concessions & Bad Debt", d.totalRentalIncome - d.adjustedGPR);
  push("Plus: Other Income (Parking, Laundry, Fees)", d.totalOtherIncome);
  push("Less: Management Fee", -(d.egi * inputs.year1Detail.managementFeePct));
  push("Less: Real Estate Taxes", -(inputs.year1Detail.propertyTaxesPerUnit * units));
  push("Less: Insurance", -(inputs.year1Detail.insurancePerUnit * units));
  push(
    "Less: Maintenance, Payroll & Admin",
    -(
      (inputs.year1Detail.repairsPerUnit +
        inputs.year1Detail.payrollPerUnit +
        inputs.year1Detail.adminPerUnit +
        inputs.year1Detail.contractServicesPerUnit +
        inputs.year1Detail.advertisingPerUnit) *
      units
    )
  );
  push("Less: Utilities", -(inputs.year1Detail.utilitiesPerUnit * units));
  push("Less: CapEx / Replacement Reserve", -(inputs.year1Detail.reservesPerUnit * units));

  const trueNetYield = running;
  const deltaPoints = advertisedYield - trueNetYield;
  const pctReduction = advertisedYield !== 0 ? deltaPoints / advertisedYield : 0;

  return { rows, advertisedYield, trueNetYield, deltaPoints, pctReduction };
}

// ---------------------------------------------------------------------------
// 3. Risk Scorecard
// ---------------------------------------------------------------------------

export type Grade = "A" | "B" | "C" | "D";
export type RiskRow = { category: string; grade: Grade; finding: string };

const GRADE_SCORE: Record<Grade, number> = { A: 4, B: 3, C: 2, D: 1 };
const SCORE_GRADE: Grade[] = ["D", "D", "C", "B", "A"]; // index by rounded score 0-4, 0/1->D

function avgGrade(grades: Grade[]): Grade {
  const avg = grades.reduce((s, g) => s + GRADE_SCORE[g], 0) / grades.length;
  return SCORE_GRADE[Math.round(avg)] ?? "C";
}

export function buildRiskScorecard(
  inputs: DealInputs,
  debt: DebtSummary,
  returns: ReturnsSummary,
  yieldModel: TrueNetYieldModel,
  marketComps: MarketComps
): RiskRow[] {
  // 1. True Net Yield vs Advertised
  const yieldReduction = yieldModel.pctReduction;
  const yieldGrade: Grade = yieldReduction < 0.2 ? "A" : yieldReduction < 0.32 ? "B" : yieldReduction < 0.45 ? "C" : "D";
  const yieldRow: RiskRow = {
    category: "True Net Yield vs Advertised",
    grade: yieldGrade,
    finding: `${fmtPct(yieldModel.advertisedYield)} advertised yield compresses to ${fmtPct(yieldModel.trueNetYield)} true net yield — a ${(yieldModel.deltaPoints * 100).toFixed(2)}-point (${fmtPct(yieldModel.pctReduction, 0)}) reduction once real operating frictions are applied.`,
  };

  // 2. Market & Location Fundamentals
  const hasComps = marketComps.salesComps.length > 0 || marketComps.rentComps.length > 0;
  const aggressiveRentGrowth = inputs.rentGrowthRate > 0.045;
  const marketGrade: Grade = !hasComps ? (aggressiveRentGrowth ? "D" : "C") : aggressiveRentGrowth ? "B" : "A";
  const marketRow: RiskRow = {
    category: "Market & Location Fundamentals",
    grade: marketGrade,
    finding: hasComps
      ? `${marketComps.salesComps.length} sales comp(s) and ${marketComps.rentComps.length} rent comp(s) on file. Rent growth assumption of ${fmtPct(inputs.rentGrowthRate)} is ${aggressiveRentGrowth ? "aggressive relative to typical submarket underwriting (>4.5%)" : "within a defensible range"}.`
      : `No sales or rent comps entered on the Market & Comps tab — price/unit and rent growth assumptions are currently unverified against the submarket. ${aggressiveRentGrowth ? `${fmtPct(inputs.rentGrowthRate)} rent growth is aggressive without comp support.` : ""}`,
  };

  // 3. Exit Liquidity
  const capSpread = returns.goingInCapRate - inputs.exitCapRate;
  const longHold = inputs.holdPeriodYears >= 7;
  const exitGrade: Grade = capSpread < -0.005 ? "D" : longHold ? "C" : capSpread < 0.01 ? "B" : "A";
  const exitRow: RiskRow = {
    category: "Exit Liquidity",
    grade: exitGrade,
    finding: `${inputs.holdPeriodYears}-year hold exiting at a ${fmtPct(inputs.exitCapRate)} cap (${(capSpread * 100).toFixed(2)}-pt spread off going-in). ${
      capSpread < 0 ? "Exit cap is tighter than going-in — the model requires cap rate compression to work." : longHold ? "Longer holds carry more exposure to a full market cycle at exit." : "Spread provides reasonable cushion against modest cap rate expansion."
    }`,
  };

  // 4. Operator / Execution Risk
  const hasT12 = inputs.t12GPRAnnual > 0;
  const gpSkinInGame = inputs.gpCoInvestPct > 0;
  const execGrade: Grade = !hasT12 && !gpSkinInGame ? "D" : !hasT12 || !gpSkinInGame ? "C" : "B";
  const execRow: RiskRow = {
    category: "Operator / Execution Risk",
    grade: execGrade,
    finding: `${hasT12 ? "T-12 actuals loaded and available to benchmark against Year 1 pro forma." : "No T-12 actuals loaded — Year 1 pro forma is unverified against trailing performance."} GP co-invest is ${fmtPct(inputs.gpCoInvestPct)}${gpSkinInGame ? ", providing alignment with LP capital." : " — sponsor has no capital at risk in the deal as modeled."}`,
  };

  // 5. CapEx Reserve Adequacy
  const reservePerUnit = inputs.capReservePerUnit;
  const capexGrade: Grade = reservePerUnit >= 450 ? "A" : reservePerUnit >= 300 ? "B" : reservePerUnit >= 200 ? "C" : "D";
  const capexRow: RiskRow = {
    category: "CapEx Reserve Adequacy",
    grade: capexGrade,
    finding: `${fmtUsd(reservePerUnit)}/unit/year reserve (${fmtUsd(reservePerUnit * inputs.unitCount)}/year total). ${
      capexGrade === "A"
        ? "In line with a well-funded value-add renovation budget."
        : capexGrade === "D"
          ? "Thin relative to typical value-add turn costs — confirm against a third-party property condition assessment before DD expires."
          : "Adequate for light-touch upkeep; verify against actual scope of planned unit turns."
    }`,
  };

  // 6. Debt & Financing Risk
  const dscr = returns.yearOneDSCR;
  const debtGrade: Grade = dscr >= 1.35 && inputs.ltv <= 0.7 ? "A" : dscr >= 1.2 ? "B" : dscr >= 1.0 ? "C" : "D";
  const debtRow: RiskRow = {
    category: "Debt & Financing Risk",
    grade: debtGrade,
    finding: `${fmtPct(inputs.ltv, 0)} LTV at ${fmtPct(inputs.interestRate, 2)}, Year 1 DSCR of ${dscr.toFixed(2)}x. ${
      dscr < 1.2 ? "Below typical 1.20-1.25x lender minimum — financing as structured may not clear underwriting." : "Clears typical lender DSCR minimums with room for NOI softness."
    }`,
  };

  // 7. Overall Deal Risk — average of the above six
  const overall = avgGrade([yieldGrade, marketGrade, exitGrade, execGrade, capexGrade, debtGrade]);
  const overallRow: RiskRow = {
    category: "Overall Deal Risk",
    grade: overall,
    finding: `Blended grade across yield compression, market verification, exit liquidity, operator execution, capex adequacy, and financing risk.`,
  };

  return [yieldRow, marketRow, exitRow, execRow, capexRow, debtRow, overallRow];
}

// ---------------------------------------------------------------------------
// Final Recommendation
// ---------------------------------------------------------------------------

export type FinalRecommendation = {
  verdict: "Proceed" | "Proceed with Conditions" | "Do Not Proceed";
  rationale: string;
  loiAdjustments: string[];
};

export function buildFinalRecommendation(riskRows: RiskRow[], returns: ReturnsSummary, inputs: DealInputs): FinalRecommendation {
  const overall = riskRows.find((r) => r.category === "Overall Deal Risk")?.grade ?? "C";
  const dCount = riskRows.filter((r) => r.grade === "D").length;

  let verdict: FinalRecommendation["verdict"];
  if (overall === "D" || dCount >= 3) verdict = "Do Not Proceed";
  else if (overall === "A" && dCount === 0) verdict = "Proceed";
  else verdict = "Proceed with Conditions";

  const rationale =
    verdict === "Proceed"
      ? "The deal clears underwriting on a risk-adjusted basis across market, execution, and financing dimensions. Standard confirmatory diligence applies."
      : verdict === "Do Not Proceed"
        ? "Multiple risk categories score in the weakest tier simultaneously. The current basis does not support moving forward without a material repricing or restructuring of terms."
        : "The deal is directionally workable but carries specific, identifiable risks that should be addressed in the LOI or resolved during due diligence before hard costs are committed.";

  const loiAdjustments: string[] = [];
  const findGrade = (cat: string) => riskRows.find((r) => r.category === cat)?.grade;

  if (findGrade("True Net Yield vs Advertised") === "C" || findGrade("True Net Yield vs Advertised") === "D") {
    loiAdjustments.push("Reduce offer price to reflect true net yield rather than advertised cap rate — request seller's trailing operating statements to substantiate NOI before finalizing price.");
  }
  if (findGrade("Market & Location Fundamentals") !== "A") {
    loiAdjustments.push("Extend due diligence period to allow time to commission independent rent and sales comps before the financing contingency deadline.");
  }
  if (findGrade("Exit Liquidity") === "C" || findGrade("Exit Liquidity") === "D") {
    loiAdjustments.push("Underwrite exit cap at or above going-in cap; do not rely on cap rate compression to achieve target returns.");
  }
  if (findGrade("Operator / Execution Risk") !== "A") {
    loiAdjustments.push(inputs.gpCoInvestPct === 0 ? "Negotiate GP co-investment (typically 5-10% of equity) to align sponsor incentives before signing." : "Request seller's T-12 and reconcile against Year 1 pro forma prior to expiration of the inspection period.");
  }
  if (findGrade("CapEx Reserve Adequacy") === "C" || findGrade("CapEx Reserve Adequacy") === "D") {
    loiAdjustments.push("Commission a third-party Property Condition Assessment during DD and request a seller credit for identified deferred maintenance.");
  }
  if (findGrade("Debt & Financing Risk") === "C" || findGrade("Debt & Financing Risk") === "D") {
    loiAdjustments.push("Resize debt to a leverage level that clears a 1.25x+ DSCR, or extend the financing contingency to shop additional lenders.");
  }

  if (loiAdjustments.length === 0) {
    loiAdjustments.push("No material LOI adjustments indicated — proceed with standard confirmatory diligence terms.");
  }

  return { verdict, rationale, loiAdjustments };
}
