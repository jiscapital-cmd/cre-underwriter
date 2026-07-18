import { computeDetailedProforma, DetailedLineItems, ZERO_DETAIL } from "./detailedProforma";

export type DealInputs = {
  propertyName: string;
  assetType: string;
  purchasePrice: number;
  closingCostsPct: number;
  holdPeriodYears: number;
  exitCapRate: number;
  saleCostsPct: number;
  rentGrowthRate: number;
  expenseGrowthRate: number;
  vacancyRate: number;
  otherIncomeGrowthRate: number;
  capReservePerUnit: number;
  unitCount: number;
  // debt
  ltv: number;
  interestRate: number;
  amortYears: number;
  ioYears: number;
  loanFeesPct: number;
  // year-1 pro forma operating basis (rolled up from rent roll / OM market rents)
  marketGPRAnnual: number;
  otherIncomeAnnual: number;
  opexYear1Annual: number; // excludes management fee
  managementFeePct: number;
  // trailing-12 actuals (from T-12 upload) — shown as its own column, not blended into Year 1-5
  t12GPRAnnual: number;
  t12VacancyLossAnnual: number;
  t12OtherIncomeAnnual: number;
  t12OpexAnnual: number; // excludes management fee
  t12ManagementFeeAnnual: number;
  t12NOIAnnual: number;
  // itemized $/unit line-item detail behind the T-12 and Year-1 aggregate
  // figures above — editing these recomputes the aggregates via
  // syncDetailToAggregates(); Year 2-5 keep growing off the aggregates only.
  t12Detail: DetailedLineItems;
  year1Detail: DetailedLineItems;
  // LOI terms
  offerScenario: OfferScenario;
  emDepositPct: number; // earnest money as % of offer price
  ddPeriodDays: number;
  financingContingencyDays: number;
  closingDays: number; // days from expiration of the inspection period to closing
  sellerConcessions: number; // $ credit requested at close
  // LOI document details
  buyerEntityName: string;
  sellerOrBrokerName: string;
  propertyAddress: string;
  propertyCity: string;
  propertyState: string;
  governingLawState: string;
  exclusivityDays: number;
  titleCompanyName: string;
  // GP/LP waterfall
  preferredReturnPct: number; // annual, compounds on unreturned capital
  gpCoInvestPct: number; // GP's share of total equity contributed (0 = pure sponsor promote)
  catchUpGPSharePct: number; // GP's share of cash during the catch-up tier
  residualGPSplitPct: number; // GP's share of the residual/promote tier (LP gets 1 - this)
};

export type OfferScenario = "Conservative" | "Base" | "Aggressive";

/** % of asking price offered under each posture. Aggressive = push harder for a discount. */
export const OFFER_SCENARIO_MULTIPLIER: Record<OfferScenario, number> = {
  Conservative: 1.0,
  Base: 0.97,
  Aggressive: 0.93,
};

export function offerPrice(inputs: DealInputs): number {
  return inputs.purchasePrice * OFFER_SCENARIO_MULTIPLIER[inputs.offerScenario];
}

export type YearLine = {
  year: number;
  gpr: number;
  vacancyLoss: number;
  otherIncome: number;
  egi: number;
  opex: number;
  managementFee: number;
  capReserve: number;
  noi: number;
  debtService: number;
  leveredCF: number;
};

export type DebtSummary = {
  loanAmount: number;
  loanFees: number;
  monthlyPayment: number;
  annualDebtServiceAmortizing: number;
  annualDebtServiceIO: number;
  equityRequired: number;
};

export type ReturnsSummary = {
  exitYearForwardNOI: number;
  exitValue: number;
  saleCosts: number;
  loanBalanceAtExit: number;
  netSaleProceeds: number;
  equityInvested: number;
  leveredCashFlows: number[]; // index 0 = year 0 (equity out, negative)
  leveredIRR: number | null;
  equityMultiple: number;
  yearOneCoC: number;
  avgCashOnCash: number;
  unleveredIRR: number | null;
  goingInCapRate: number;
  yearOneDSCR: number;
};

function pmt(rate: number, nper: number, pv: number): number {
  if (rate === 0) return pv / nper;
  return (rate * pv) / (1 - Math.pow(1 + rate, -nper));
}

export function computeDebt(inputs: DealInputs): DebtSummary {
  const loanAmount = offerPrice(inputs) * inputs.ltv;
  const loanFees = loanAmount * inputs.loanFeesPct;
  const monthlyPayment = pmt(inputs.interestRate / 12, inputs.amortYears * 12, loanAmount);
  const annualDebtServiceAmortizing = monthlyPayment * 12;
  const annualDebtServiceIO = loanAmount * inputs.interestRate;
  const totalAcquisitionCost = offerPrice(inputs) * (1 + inputs.closingCostsPct);
  const equityRequired = totalAcquisitionCost + loanFees - loanAmount - inputs.sellerConcessions;
  return { loanAmount, loanFees, monthlyPayment, annualDebtServiceAmortizing, annualDebtServiceIO, equityRequired };
}

/** Recomputes the aggregate T-12/Year-1 fields (marketGPRAnnual, vacancyRate,
 * opexYear1Annual, etc.) from the itemized $/unit detail tables. Year 2-5
 * are unaffected — they only ever read the aggregates this produces. */
export function syncDetailToAggregates(inputs: DealInputs): DealInputs {
  const units = inputs.unitCount;
  const y1 = computeDetailedProforma(inputs.year1Detail, units);
  const t12 = computeDetailedProforma(inputs.t12Detail, units);

  return {
    ...inputs,
    marketGPRAnnual: y1.gpr,
    otherIncomeAnnual: y1.totalOtherIncome,
    opexYear1Annual: y1.opexBeforeReserves - y1.egi * inputs.year1Detail.managementFeePct, // excl. mgmt fee, which computeProforma adds separately
    managementFeePct: inputs.year1Detail.managementFeePct,
    capReservePerUnit: inputs.year1Detail.reservesPerUnit,
    vacancyRate: y1.gpr > 0 ? 1 - y1.totalRentalIncome / y1.gpr : 0, // blended economic loss rate (vacancy+concessions+bad debt+other)
    t12GPRAnnual: t12.gpr,
    t12VacancyLossAnnual: t12.totalRentalIncome - t12.gpr,
    t12OtherIncomeAnnual: t12.totalOtherIncome,
    t12OpexAnnual: t12.opexBeforeReserves - t12.egi * inputs.t12Detail.managementFeePct,
    t12ManagementFeeAnnual: t12.egi * inputs.t12Detail.managementFeePct,
    t12NOIAnnual: t12.noi,
  };
}

export function hasT12Actuals(inputs: DealInputs): boolean {
  return (
    inputs.t12GPRAnnual > 0 ||
    inputs.t12OpexAnnual > 0 ||
    inputs.t12OtherIncomeAnnual > 0 ||
    inputs.t12NOIAnnual > 0
  );
}

/** Trailing-12 actuals as reported — not a projection, no growth/vacancy
 * formula applied. Shown as a reference column ahead of Year 1-5 in the
 * Proforma so actuals and underwritten assumptions are visibly distinct. */
export function computeT12Actuals(inputs: DealInputs): YearLine {
  const egi = inputs.t12GPRAnnual + inputs.t12VacancyLossAnnual + inputs.t12OtherIncomeAnnual;
  const noi = inputs.t12NOIAnnual > 0 ? inputs.t12NOIAnnual : egi - inputs.t12OpexAnnual - inputs.t12ManagementFeeAnnual;
  return {
    year: 0,
    gpr: inputs.t12GPRAnnual,
    vacancyLoss: inputs.t12VacancyLossAnnual,
    otherIncome: inputs.t12OtherIncomeAnnual,
    egi,
    opex: inputs.t12OpexAnnual,
    managementFee: inputs.t12ManagementFeeAnnual,
    capReserve: 0,
    noi,
    debtService: 0,
    leveredCF: noi,
  };
}

export function computeProforma(inputs: DealInputs, debt: DebtSummary): YearLine[] {
  const lines: YearLine[] = [];
  let priorGPR = inputs.marketGPRAnnual;
  let priorOtherIncome = inputs.otherIncomeAnnual;
  let priorOpex = inputs.opexYear1Annual;

  for (let year = 1; year <= inputs.holdPeriodYears; year++) {
    const gpr = year === 1 ? inputs.marketGPRAnnual : priorGPR * (1 + inputs.rentGrowthRate);
    const otherIncome = year === 1 ? inputs.otherIncomeAnnual : priorOtherIncome * (1 + inputs.otherIncomeGrowthRate);
    const opex = year === 1 ? inputs.opexYear1Annual : priorOpex * (1 + inputs.expenseGrowthRate);
    const vacancyLoss = -gpr * inputs.vacancyRate;
    const egi = gpr + vacancyLoss + otherIncome;
    const managementFee = egi * inputs.managementFeePct;
    const capReserve = inputs.capReservePerUnit * inputs.unitCount;
    const noi = egi - opex - managementFee;
    const debtService = year <= inputs.ioYears ? debt.annualDebtServiceIO : debt.annualDebtServiceAmortizing;
    const leveredCF = noi - debtService - capReserve;

    lines.push({ year, gpr, vacancyLoss, otherIncome, egi, opex, managementFee, capReserve, noi, debtService, leveredCF });

    priorGPR = gpr;
    priorOtherIncome = otherIncome;
    priorOpex = opex;
  }
  return lines;
}

function irr(cashflows: number[]): number | null {
  // Newton-Raphson with bisection fallback
  const hasPos = cashflows.some((c) => c > 0);
  const hasNeg = cashflows.some((c) => c < 0);
  if (!hasPos || !hasNeg) return null;

  const npv = (rate: number) =>
    cashflows.reduce((sum, cf, t) => sum + cf / Math.pow(1 + rate, t), 0);

  let lo = -0.99;
  let hi = 10;
  let fLo = npv(lo);
  let fHi = npv(hi);
  if (fLo * fHi > 0) return null;

  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const fMid = npv(mid);
    if (Math.abs(fMid) < 1e-7) return mid;
    if (fLo * fMid < 0) {
      hi = mid;
      fHi = fMid;
    } else {
      lo = mid;
      fLo = fMid;
    }
  }
  return (lo + hi) / 2;
}

export function computeReturns(inputs: DealInputs, debt: DebtSummary, proforma: YearLine[]): ReturnsSummary {
  const exitYear = inputs.holdPeriodYears;
  const exitLine = proforma[exitYear - 1];
  // Forward NOI (year after exit) approximated by growing exit-year NOI at rent growth rate
  const exitYearForwardNOI = exitLine.noi * (1 + inputs.rentGrowthRate);
  const exitValue = exitYearForwardNOI / inputs.exitCapRate;
  const saleCosts = exitValue * inputs.saleCostsPct;

  const loanBalanceAtExit =
    exitYear <= inputs.ioYears
      ? debt.loanAmount
      : Math.max(0, debt.loanAmount - (debt.loanAmount / inputs.amortYears) * (exitYear - inputs.ioYears));

  const netSaleProceeds = exitValue - saleCosts - loanBalanceAtExit;
  const equityInvested = debt.equityRequired;

  const leveredCashFlows: number[] = [-equityInvested];
  proforma.forEach((line, idx) => {
    const isExitYear = line.year === exitYear;
    leveredCashFlows.push(line.leveredCF + (isExitYear ? netSaleProceeds : 0));
  });

  const leveredIRR = irr(leveredCashFlows);
  const totalCashReturned = leveredCashFlows.slice(1).reduce((a, b) => a + b, 0);
  const equityMultiple = totalCashReturned / equityInvested;
  const yearOneCoC = proforma[0].leveredCF / equityInvested;
  const preExitYears = proforma.filter((l) => l.year < exitYear);
  const avgCashOnCash =
    preExitYears.length > 0
      ? preExitYears.reduce((a, l) => a + l.leveredCF, 0) / preExitYears.length / equityInvested
      : yearOneCoC;

  const totalAcquisitionCost = offerPrice(inputs) * (1 + inputs.closingCostsPct);
  const unleveredCashFlows: number[] = [-totalAcquisitionCost];
  proforma.forEach((line, idx) => {
    const isExitYear = line.year === exitYear;
    unleveredCashFlows.push(line.noi + (isExitYear ? exitValue - saleCosts : 0));
  });
  const unleveredIRR = irr(unleveredCashFlows);

  const goingInCapRate = proforma[0].noi / offerPrice(inputs);
  const yearOneDSCR = proforma[0].noi / proforma[0].debtService;

  return {
    exitYearForwardNOI,
    exitValue,
    saleCosts,
    loanBalanceAtExit,
    netSaleProceeds,
    equityInvested,
    leveredCashFlows,
    leveredIRR,
    equityMultiple,
    yearOneCoC,
    avgCashOnCash,
    unleveredIRR,
    goingInCapRate,
    yearOneDSCR,
  };
}

export type SensitivityCell = { exitCapDelta: number; rentGrowthDelta: number; irr: number | null };

export function computeSensitivity(inputs: DealInputs, debt: DebtSummary): SensitivityCell[][] {
  const deltas = [-0.01, -0.005, 0, 0.005, 0.01];
  return deltas.map((capDelta) =>
    deltas.map((growthDelta) => {
      const scenario: DealInputs = {
        ...inputs,
        exitCapRate: inputs.exitCapRate + capDelta,
        rentGrowthRate: inputs.rentGrowthRate + growthDelta,
      };
      const proforma = computeProforma(scenario, debt);
      const returns = computeReturns(scenario, debt, proforma);
      return { exitCapDelta: capDelta, rentGrowthDelta: growthDelta, irr: returns.leveredIRR };
    })
  );
}

export function runUnderwriting(inputs: DealInputs) {
  const debt = computeDebt(inputs);
  const proforma = computeProforma(inputs, debt);
  const returns = computeReturns(inputs, debt, proforma);
  const sensitivity = computeSensitivity(inputs, debt);
  const sourcesAndUses = computeSourcesAndUses(inputs, debt);
  return { debt, proforma, returns, sensitivity, sourcesAndUses };
}

export type SourcesAndUsesLine = { label: string; amount: number };
export type SourcesAndUses = {
  uses: SourcesAndUsesLine[];
  sources: SourcesAndUsesLine[];
  totalUses: number;
  totalSources: number;
};

export function computeSourcesAndUses(inputs: DealInputs, debt: DebtSummary): SourcesAndUses {
  const closingCosts = offerPrice(inputs) * inputs.closingCostsPct;

  const uses: SourcesAndUsesLine[] = [
    { label: "Purchase Price (Offer)", amount: offerPrice(inputs) },
    { label: "Closing Costs", amount: closingCosts },
    { label: "Loan Fees", amount: debt.loanFees },
  ];
  const totalUses = uses.reduce((sum, l) => sum + l.amount, 0);

  const sources: SourcesAndUsesLine[] = [
    { label: "Senior Loan", amount: debt.loanAmount },
    ...(inputs.sellerConcessions > 0
      ? [{ label: "Seller Concession Credit", amount: inputs.sellerConcessions }]
      : []),
    { label: "Equity", amount: debt.equityRequired },
  ];
  const totalSources = sources.reduce((sum, l) => sum + l.amount, 0);

  return { uses, sources, totalUses, totalSources };
}

const DEFAULT_YEAR1_DETAIL: DetailedLineItems = {
  gprPerUnit: 12_600, // ~$1,050/mo market rent
  tenantAssistancePerUnit: 0,
  marketRentIncreasePct: 0,
  lossToLeasePct: 0.02,
  vacancyPct: 0.05,
  concessionsPct: 0.01,
  badDebtPct: 0.01,
  modelsAdminPct: 0,
  employeeUnitsPct: 0,
  otherIncomePerUnit: 720,
  utilityReimbPerUnit: 0,
  payrollPerUnit: 1_550,
  adminPerUnit: 250,
  repairsPerUnit: 450,
  contractServicesPerUnit: 550,
  advertisingPerUnit: 50,
  utilitiesPerUnit: 500,
  insurancePerUnit: 350,
  managementFeePct: 0.035,
  propertyTaxesPerUnit: 950,
  otherOpexPerUnit: 0,
  reservesPerUnit: 250,
};

export const DEFAULT_INPUTS: DealInputs = syncDetailToAggregates({
  propertyName: "Concord Apartment Homes",
  assetType: "Multifamily",
  purchasePrice: 6_000_000,
  closingCostsPct: 0.02,
  holdPeriodYears: 5,
  exitCapRate: 0.06,
  saleCostsPct: 0.02,
  rentGrowthRate: 0.03,
  expenseGrowthRate: 0.025,
  vacancyRate: 0.07,
  otherIncomeGrowthRate: 0.03,
  capReservePerUnit: 250,
  unitCount: 138,
  ltv: 0.65,
  interestRate: 0.065,
  amortYears: 30,
  ioYears: 2,
  loanFeesPct: 0.01,
  marketGPRAnnual: 0, // overwritten by syncDetailToAggregates below
  otherIncomeAnnual: 0,
  opexYear1Annual: 0,
  managementFeePct: 0.035,
  t12GPRAnnual: 0,
  t12VacancyLossAnnual: 0,
  t12OtherIncomeAnnual: 0,
  t12OpexAnnual: 0,
  t12ManagementFeeAnnual: 0,
  t12NOIAnnual: 0,
  t12Detail: ZERO_DETAIL,
  year1Detail: DEFAULT_YEAR1_DETAIL,
  offerScenario: "Base",
  emDepositPct: 0.01,
  ddPeriodDays: 45,
  financingContingencyDays: 60,
  closingDays: 75,
  sellerConcessions: 0,
  buyerEntityName: "",
  sellerOrBrokerName: "",
  propertyAddress: "",
  propertyCity: "",
  propertyState: "",
  governingLawState: "Texas",
  exclusivityDays: 45,
  titleCompanyName: "",
  preferredReturnPct: 0.08,
  gpCoInvestPct: 0,
  catchUpGPSharePct: 0.5,
  residualGPSplitPct: 0.3,
});

/** Deep-merges a saved deal's inputs onto DEFAULT_INPUTS so a deal saved
 * under an older schema (missing fields added since) loads without crashing
 * on undefined — any field absent from the saved JSON falls back to default. */
export function hydrateInputs(saved: Partial<DealInputs> | null | undefined): DealInputs {
  const s = saved ?? {};
  return {
    ...DEFAULT_INPUTS,
    ...s,
    t12Detail: { ...DEFAULT_INPUTS.t12Detail, ...(s.t12Detail ?? {}) },
    year1Detail: { ...DEFAULT_INPUTS.year1Detail, ...(s.year1Detail ?? {}) },
  };
}
