export type DetailedLineItems = {
  gprPerUnit: number; // Net Rental Income / Gross Potential Rent, $/unit/yr
  tenantAssistancePerUnit: number;
  marketRentIncreasePct: number; // "Projected Increase in Market Rents" — % of GPR, added
  lossToLeasePct: number; // "Less: Loss/Gain to Lease" — % of GPR, subtracted
  vacancyPct: number; // % of Adjusted GPR
  concessionsPct: number; // % of Adjusted GPR
  badDebtPct: number; // % of Adjusted GPR
  modelsAdminPct: number; // % of Adjusted GPR
  employeeUnitsPct: number; // % of Adjusted GPR
  otherIncomePerUnit: number;
  utilityReimbPerUnit: number;
  // operating expenses, $/unit/yr unless noted
  payrollPerUnit: number;
  adminPerUnit: number;
  repairsPerUnit: number;
  contractServicesPerUnit: number;
  advertisingPerUnit: number;
  utilitiesPerUnit: number;
  insurancePerUnit: number;
  managementFeePct: number; // % of EGI
  propertyTaxesPerUnit: number;
  otherOpexPerUnit: number; // uncategorized/lump-sum opex, e.g. from a T-12 upload before manual reclassification
  reservesPerUnit: number;
};

/** All-zero starting point — used for T-12 by default, since a fresh deal
 * has no trailing actuals until a T-12 is uploaded or entered manually. */
export const ZERO_DETAIL: DetailedLineItems = {
  gprPerUnit: 0,
  tenantAssistancePerUnit: 0,
  marketRentIncreasePct: 0,
  lossToLeasePct: 0,
  vacancyPct: 0,
  concessionsPct: 0,
  badDebtPct: 0,
  modelsAdminPct: 0,
  employeeUnitsPct: 0,
  otherIncomePerUnit: 0,
  utilityReimbPerUnit: 0,
  payrollPerUnit: 0,
  adminPerUnit: 0,
  repairsPerUnit: 0,
  contractServicesPerUnit: 0,
  advertisingPerUnit: 0,
  utilitiesPerUnit: 0,
  insurancePerUnit: 0,
  managementFeePct: 0,
  propertyTaxesPerUnit: 0,
  otherOpexPerUnit: 0,
  reservesPerUnit: 0,
};

export type DetailedProformaRow = { label: string; perUnit: number | null; annual: number; note?: string; bold?: boolean };

export type DetailedProformaResult = {
  incomeRows: DetailedProformaRow[];
  expenseRows: DetailedProformaRow[];
  gpr: number;
  adjustedGPR: number;
  totalRentalIncome: number;
  economicOccupancyPct: number;
  totalOtherIncome: number;
  egi: number;
  controllableExpenses: number;
  opexBeforeReserves: number;
  totalOpex: number; // excludes management fee is FALSE here — includes mgmt fee, matches "Total Operating Expenses" in image
  noi: number;
};

export function computeDetailedProforma(d: DetailedLineItems, units: number): DetailedProformaResult {
  const gpr = d.gprPerUnit * units;
  const tenantAssistance = d.tenantAssistancePerUnit * units;
  const marketIncrease = gpr * d.marketRentIncreasePct;
  const lossToLease = gpr * d.lossToLeasePct;
  const adjustedGPR = gpr + tenantAssistance + marketIncrease - lossToLease;

  const vacancy = adjustedGPR * d.vacancyPct;
  const concessions = adjustedGPR * d.concessionsPct;
  const badDebt = adjustedGPR * d.badDebtPct;
  const modelsAdmin = adjustedGPR * d.modelsAdminPct;
  const employeeUnits = adjustedGPR * d.employeeUnitsPct;
  const totalRentalIncome = adjustedGPR - vacancy - concessions - badDebt - modelsAdmin - employeeUnits;
  const economicOccupancyPct = gpr > 0 ? totalRentalIncome / gpr : 0;

  const otherIncome = d.otherIncomePerUnit * units;
  const utilityReimb = d.utilityReimbPerUnit * units;
  const totalOtherIncome = otherIncome + utilityReimb;

  const egi = totalRentalIncome + totalOtherIncome;

  const payroll = d.payrollPerUnit * units;
  const admin = d.adminPerUnit * units;
  const repairs = d.repairsPerUnit * units;
  const contractServices = d.contractServicesPerUnit * units;
  const advertising = d.advertisingPerUnit * units;
  const controllableExpenses = payroll + admin + repairs + contractServices + advertising;

  const utilities = d.utilitiesPerUnit * units;
  const insurance = d.insurancePerUnit * units;
  const managementFee = egi * d.managementFeePct;
  const propertyTaxes = d.propertyTaxesPerUnit * units;
  const otherOpex = d.otherOpexPerUnit * units;
  const opexBeforeReserves = controllableExpenses + utilities + insurance + managementFee + propertyTaxes + otherOpex;

  const reserves = d.reservesPerUnit * units;
  const totalOpex = opexBeforeReserves + reserves;

  const noi = egi - totalOpex;

  const pu = (annual: number) => (units > 0 ? annual / units : 0);

  const incomeRows: DetailedProformaRow[] = [
    { label: "Net Rental Income / Gross Potential Rent", perUnit: d.gprPerUnit, annual: gpr, note: "Per current rent schedule" },
    { label: "Tenant Assistance Payments", perUnit: d.tenantAssistancePerUnit, annual: tenantAssistance },
    { label: "Projected Increase in Market Rents", perUnit: null, annual: marketIncrease, note: `${(d.marketRentIncreasePct * 100).toFixed(2)}%` },
    { label: "Less: Loss/Gain to Lease", perUnit: null, annual: -lossToLease, note: `${(d.lossToLeasePct * 100).toFixed(2)}%` },
    { label: "Adjusted Gross Potential Rent", perUnit: pu(adjustedGPR), annual: adjustedGPR, bold: true },
    { label: "Vacancy Loss", perUnit: null, annual: -vacancy, note: `${(d.vacancyPct * 100).toFixed(2)}%` },
    { label: "Concessions", perUnit: null, annual: -concessions, note: `${(d.concessionsPct * 100).toFixed(2)}%` },
    { label: "Bad Debt", perUnit: null, annual: -badDebt, note: `${(d.badDebtPct * 100).toFixed(2)}%` },
    { label: "Models/Administrative Units", perUnit: null, annual: -modelsAdmin, note: `${(d.modelsAdminPct * 100).toFixed(2)}%` },
    { label: "Employee Units", perUnit: null, annual: -employeeUnits, note: `${(d.employeeUnitsPct * 100).toFixed(2)}%` },
    { label: "Total Rental Income", perUnit: pu(totalRentalIncome), annual: totalRentalIncome, bold: true },
    { label: "Economic Occupancy (% of GPR)", perUnit: null, annual: economicOccupancyPct, note: "ratio" },
    { label: "Other Income", perUnit: d.otherIncomePerUnit, annual: otherIncome },
    { label: "Utility Reimbursements", perUnit: d.utilityReimbPerUnit, annual: utilityReimb },
    { label: "Total Other Income", perUnit: pu(totalOtherIncome), annual: totalOtherIncome, bold: true },
    { label: "Effective Gross Income", perUnit: pu(egi), annual: egi, bold: true },
  ];

  const expenseRows: DetailedProformaRow[] = [
    { label: "Payroll & Benefits", perUnit: d.payrollPerUnit, annual: payroll },
    { label: "General & Administrative", perUnit: d.adminPerUnit, annual: admin },
    { label: "Repairs & Maintenance", perUnit: d.repairsPerUnit, annual: repairs },
    { label: "Contract Services", perUnit: d.contractServicesPerUnit, annual: contractServices },
    { label: "Advertising & Promotion", perUnit: d.advertisingPerUnit, annual: advertising },
    { label: "Controllable Expenses", perUnit: pu(controllableExpenses), annual: controllableExpenses, bold: true },
    { label: "Utilities", perUnit: d.utilitiesPerUnit, annual: utilities },
    { label: "Insurance", perUnit: d.insurancePerUnit, annual: insurance },
    { label: "Management Fee", perUnit: pu(managementFee), annual: managementFee, note: `${(d.managementFeePct * 100).toFixed(2)}% of EGI` },
    { label: "Property Taxes", perUnit: d.propertyTaxesPerUnit, annual: propertyTaxes },
    { label: "Other / Uncategorized Opex", perUnit: d.otherOpexPerUnit, annual: otherOpex },
    { label: "Operating Expense Before Reserves", perUnit: pu(opexBeforeReserves), annual: opexBeforeReserves, bold: true },
    { label: "Replacement Reserves", perUnit: d.reservesPerUnit, annual: reserves },
    { label: "Total Operating Expenses", perUnit: pu(totalOpex), annual: totalOpex, bold: true },
    { label: "Net Operating Income", perUnit: pu(noi), annual: noi, bold: true },
  ];

  return {
    incomeRows,
    expenseRows,
    gpr,
    adjustedGPR,
    totalRentalIncome,
    economicOccupancyPct,
    totalOtherIncome,
    egi,
    controllableExpenses,
    opexBeforeReserves,
    totalOpex,
    noi,
  };
}
