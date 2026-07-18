import { DealInputs, DebtSummary, YearLine, computeDebt, computeProforma } from "./underwriting";

export type DebtProgram = {
  name: "Agency (Fannie/Freddie)" | "Local Bank" | "Bridge Loan" | "Seller Financing";
  ltv: number;
  interestRate: number;
  amortYears: number;
  ioYears: number;
  loanFeesPct: number;
  notes: string;
};

export const DEBT_PROGRAMS: DebtProgram[] = [
  {
    name: "Agency (Fannie/Freddie)",
    ltv: 0.7,
    interestRate: 0.06,
    amortYears: 30,
    ioYears: 2,
    loanFeesPct: 0.01,
    notes: "Best pricing, longest terms; requires seasoning/DSCR ≥1.25x, 60-90 day process.",
  },
  {
    name: "Local Bank",
    ltv: 0.65,
    interestRate: 0.0675,
    amortYears: 25,
    ioYears: 1,
    loanFeesPct: 0.0075,
    notes: "Faster close, more flexible on property condition; typically recourse.",
  },
  {
    name: "Bridge Loan",
    ltv: 0.75,
    interestRate: 0.085,
    amortYears: 30,
    ioYears: 3,
    loanFeesPct: 0.02,
    notes: "Higher leverage/cost for value-add execution; plan to refinance into agency debt post-stabilization.",
  },
  {
    name: "Seller Financing",
    ltv: 0.6,
    interestRate: 0.055,
    amortYears: 25,
    ioYears: 2,
    loanFeesPct: 0.0,
    notes: "Deal-dependent; strongest if seller wants to defer gain recognition. No third-party underwriting delay.",
  },
];

export type DebtScenarioResult = {
  program: DebtProgram;
  debt: DebtSummary;
  yearOneNOI: number;
  yearOneDSCR: number;
  debtYield: number;
};

export function evaluateDebtPrograms(inputs: DealInputs): DebtScenarioResult[] {
  return DEBT_PROGRAMS.map((program) => {
    const scenarioInputs: DealInputs = {
      ...inputs,
      ltv: program.ltv,
      interestRate: program.interestRate,
      amortYears: program.amortYears,
      ioYears: program.ioYears,
      loanFeesPct: program.loanFeesPct,
    };
    const debt = computeDebt(scenarioInputs);
    const proforma = computeProforma(scenarioInputs, debt);
    const yearOneNOI = proforma[0].noi;
    const yearOneDSCR = yearOneNOI / proforma[0].debtService;
    const debtYield = yearOneNOI / debt.loanAmount;
    return { program, debt, yearOneNOI, yearOneDSCR, debtYield };
  });
}

export type RefinanceAnalysis = {
  refinanceYear: number;
  stabilizedNOI: number;
  refinanceValue: number;
  newLoanAmount: number;
  refinanceProceeds: number; // cash out (or in) vs. original loan balance
};

export function computeRefinanceAnalysis(
  inputs: DealInputs,
  proforma: YearLine[],
  refinanceYear: number,
  refinanceCapRate: number,
  refinanceLTV: number,
  originalLoanBalanceAtRefi: number
): RefinanceAnalysis {
  const stabilizedNOI = proforma[Math.min(refinanceYear, proforma.length) - 1]?.noi ?? proforma[proforma.length - 1].noi;
  const refinanceValue = stabilizedNOI / refinanceCapRate;
  const newLoanAmount = refinanceValue * refinanceLTV;
  const refinanceProceeds = newLoanAmount - originalLoanBalanceAtRefi;

  return { refinanceYear, stabilizedNOI, refinanceValue, newLoanAmount, refinanceProceeds };
}
