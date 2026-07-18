import { DealInputs } from "./underwriting";

export type Confidence = "High" | "Medium" | "Low";
export type AssumptionRow = {
  category: string;
  assumption: string;
  value: string;
  source: string;
  confidence: Confidence;
  footnote: string;
};

export function buildAssumptionsRegister(inputs: DealInputs): AssumptionRow[] {
  return [
    {
      category: "Acquisition",
      assumption: "Purchase Price (Asking)",
      value: inputs.purchasePrice.toLocaleString("en-US", { style: "currency", currency: "USD" }),
      source: "Offering Memorandum",
      confidence: "High",
      footnote: "Fact — as quoted by broker/seller.",
    },
    {
      category: "Acquisition",
      assumption: "Closing Costs %",
      value: `${(inputs.closingCostsPct * 100).toFixed(1)}%`,
      source: "Buyer estimate",
      confidence: "Medium",
      footnote: "Assumption — confirm with title/escrow quote during DD.",
    },
    {
      category: "Revenue",
      assumption: "Market Gross Potential Rent (Annual)",
      value: inputs.marketGPRAnnual.toLocaleString("en-US", { style: "currency", currency: "USD" }),
      source: "Rent Roll extraction",
      confidence: "High",
      footnote: "Fact if sourced from actual rent roll; verify unit-by-unit against T-12 collections.",
    },
    {
      category: "Revenue",
      assumption: "Rent Growth Rate (Annual)",
      value: `${(inputs.rentGrowthRate * 100).toFixed(1)}%`,
      source: "Market comps / buyer thesis",
      confidence: "Medium",
      footnote: "Assumption — cross-check against submarket rent comps in Market & Comps tab.",
    },
    {
      category: "Revenue",
      assumption: "Vacancy & Credit Loss",
      value: `${(inputs.vacancyRate * 100).toFixed(1)}%`,
      source: "T-12 trailing average",
      confidence: "Medium",
      footnote: "Fact if from actual T-12; if underwritten stabilized rate, flag as assumption.",
    },
    {
      category: "Revenue",
      assumption: "Other Income (Annual)",
      value: inputs.otherIncomeAnnual.toLocaleString("en-US", { style: "currency", currency: "USD" }),
      source: "T-12 extraction",
      confidence: "Medium",
      footnote: "Confirm ancillary income (RUBS, parking, laundry) is recurring, not one-time.",
    },
    {
      category: "Expenses",
      assumption: "Operating Expenses Year 1 (excl. mgmt fee)",
      value: inputs.opexYear1Annual.toLocaleString("en-US", { style: "currency", currency: "USD" }),
      source: "T-12 extraction",
      confidence: "High",
      footnote: "Fact if sourced from actual T-12; watch for owner-specific line items that won't transfer.",
    },
    {
      category: "Expenses",
      assumption: "Expense Growth Rate (Annual)",
      value: `${(inputs.expenseGrowthRate * 100).toFixed(1)}%`,
      source: "Buyer estimate",
      confidence: "Low",
      footnote: "Assumption — historically expenses have run above CPI in this asset class; stress-test.",
    },
    {
      category: "Expenses",
      assumption: "Management Fee %",
      value: `${(inputs.managementFeePct * 100).toFixed(1)}%`,
      source: "Buyer's 3rd-party PM quote",
      confidence: "High",
      footnote: "Confirm actual quote vs. market-standard 3-4% of EGI for this unit count.",
    },
    {
      category: "Expenses",
      assumption: "Capital Reserve ($/unit/yr)",
      value: `$${inputs.capReservePerUnit}`,
      source: "Buyer estimate",
      confidence: "Low",
      footnote: "Assumption — validate against PCA (Property Condition Assessment) once received.",
    },
    {
      category: "Financing",
      assumption: "LTV",
      value: `${(inputs.ltv * 100).toFixed(0)}%`,
      source: "Lender term sheet / buyer target",
      confidence: "Medium",
      footnote: "Assumption until term sheet in hand — see Debt & Financing tab for program comparison.",
    },
    {
      category: "Financing",
      assumption: "Interest Rate",
      value: `${(inputs.interestRate * 100).toFixed(2)}%`,
      source: "Lender indication",
      confidence: "Medium",
      footnote: "Rate-lock risk — reconfirm at financing contingency deadline.",
    },
    {
      category: "Exit",
      assumption: "Exit Cap Rate",
      value: `${(inputs.exitCapRate * 100).toFixed(2)}%`,
      source: "Buyer thesis (going-in cap + expansion cushion)",
      confidence: "Low",
      footnote: "Assumption — the single most sensitive variable in the model; see Sensitivity tab.",
    },
    {
      category: "Exit",
      assumption: "Hold Period",
      value: `${inputs.holdPeriodYears} years`,
      source: "Buyer investment strategy",
      confidence: "High",
      footnote: "Fact — fund/investor mandate driven.",
    },
    {
      category: "Exit",
      assumption: "Sale Costs %",
      value: `${(inputs.saleCostsPct * 100).toFixed(1)}%`,
      source: "Buyer estimate (broker commission + closing)",
      confidence: "High",
      footnote: "Standard market convention 1.5-2.5% of sale price.",
    },
  ];
}
