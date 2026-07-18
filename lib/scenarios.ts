import { DealInputs, computeDebt, computeProforma, computeReturns, ReturnsSummary, YearLine } from "./underwriting";

export type ScenarioName = "Worst Case" | "Base Case" | "Best Case";

export type ScenarioResult = {
  name: ScenarioName;
  inputs: DealInputs;
  proforma: YearLine[];
  returns: ReturnsSummary;
};

function applyDeltas(base: DealInputs, name: ScenarioName): DealInputs {
  switch (name) {
    case "Worst Case":
      return {
        ...base,
        rentGrowthRate: Math.max(0, base.rentGrowthRate - 0.02),
        expenseGrowthRate: base.expenseGrowthRate + 0.015,
        vacancyRate: base.vacancyRate + 0.03,
        exitCapRate: base.exitCapRate + 0.0075,
        interestRate: base.interestRate + 0.01,
      };
    case "Best Case":
      return {
        ...base,
        rentGrowthRate: base.rentGrowthRate + 0.02,
        expenseGrowthRate: Math.max(0, base.expenseGrowthRate - 0.01),
        vacancyRate: Math.max(0, base.vacancyRate - 0.02),
        exitCapRate: Math.max(0.03, base.exitCapRate - 0.005),
        interestRate: Math.max(0.02, base.interestRate - 0.005),
      };
    default:
      return base;
  }
}

export function runScenarios(base: DealInputs): ScenarioResult[] {
  const names: ScenarioName[] = ["Worst Case", "Base Case", "Best Case"];
  return names.map((name) => {
    const scenarioInputs = applyDeltas(base, name);
    const debt = computeDebt(scenarioInputs);
    const proforma = computeProforma(scenarioInputs, debt);
    const returns = computeReturns(scenarioInputs, debt, proforma);
    return { name, inputs: scenarioInputs, proforma, returns };
  });
}

export type BreakEven = {
  breakEvenOccupancyPct: number; // occupancy needed to cover opex + debt service
  breakEvenRentPerUnitMonthly: number; // avg monthly rent/unit needed to cover opex + debt service at current vacancy
  marginOfSafetyOccPts: number; // underwritten occupancy minus breakeven occupancy, in points
};

export function computeBreakEven(inputs: DealInputs, proforma: YearLine[]): BreakEven {
  const year1 = proforma[0];
  const fixedCosts = year1.opex + year1.managementFee + year1.debtService;
  const breakEvenOccupancyPct = fixedCosts / inputs.marketGPRAnnual;
  const breakEvenRentPerUnitMonthly = fixedCosts / inputs.unitCount / 12 / (1 - inputs.vacancyRate);
  const underwrittenOccupancy = 1 - inputs.vacancyRate;
  const marginOfSafetyOccPts = (underwrittenOccupancy - breakEvenOccupancyPct) * 100;

  return { breakEvenOccupancyPct, breakEvenRentPerUnitMonthly, marginOfSafetyOccPts };
}
