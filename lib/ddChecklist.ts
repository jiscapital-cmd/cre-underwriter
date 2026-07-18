export type DDItem = { category: string; item: string; dueDayFromEffective: number; owner: string };

export function buildDdChecklist(ddPeriodDays: number): DDItem[] {
  const p = ddPeriodDays;
  return [
    { category: "Financial", item: "Full T-12 + trailing 24-month operating statements", dueDayFromEffective: 5, owner: "Seller" },
    { category: "Financial", item: "Current rent roll with lease start/end dates", dueDayFromEffective: 5, owner: "Seller" },
    { category: "Financial", item: "Prior 2 years tax returns / operating statements", dueDayFromEffective: 10, owner: "Seller" },
    { category: "Financial", item: "Utility bills (12 months, all meters)", dueDayFromEffective: 10, owner: "Seller" },
    { category: "Physical", item: "Property Condition Assessment (PCA)", dueDayFromEffective: Math.round(p * 0.5), owner: "Buyer (3rd party)" },
    { category: "Physical", item: "Phase I Environmental Site Assessment", dueDayFromEffective: Math.round(p * 0.5), owner: "Buyer (3rd party)" },
    { category: "Physical", item: "Roof, HVAC, plumbing, electrical inspection", dueDayFromEffective: Math.round(p * 0.6), owner: "Buyer (3rd party)" },
    { category: "Physical", item: "Unit-by-unit interior walkthrough (sample ≥25%)", dueDayFromEffective: Math.round(p * 0.6), owner: "Buyer" },
    { category: "Legal", item: "Title commitment and survey review", dueDayFromEffective: 15, owner: "Buyer / Title Co." },
    { category: "Legal", item: "Zoning compliance / certificate of occupancy", dueDayFromEffective: Math.round(p * 0.4), owner: "Buyer" },
    { category: "Legal", item: "Litigation / lien search", dueDayFromEffective: Math.round(p * 0.4), owner: "Buyer" },
    { category: "Legal", item: "Service contracts, warranties, and estoppels review", dueDayFromEffective: Math.round(p * 0.5), owner: "Seller / Buyer" },
    { category: "Leases", item: "Lease abstract of all units vs. rent roll", dueDayFromEffective: Math.round(p * 0.5), owner: "Buyer" },
    { category: "Leases", item: "Tenant estoppel certificates", dueDayFromEffective: Math.round(p * 0.8), owner: "Seller" },
    { category: "Insurance", item: "Loss run history (5 years)", dueDayFromEffective: 10, owner: "Seller" },
    { category: "Insurance", item: "Insurance quote for buyer's ownership", dueDayFromEffective: Math.round(p * 0.6), owner: "Buyer" },
    { category: "Financing", item: "Submit to lender, order 3rd-party reports (appraisal, PCA, Phase I)", dueDayFromEffective: 7, owner: "Buyer" },
    { category: "Financing", item: "Lender underwriting / term sheet finalization", dueDayFromEffective: Math.round(p * 0.85), owner: "Buyer / Lender" },
    { category: "Closing Prep", item: "Final walkthrough", dueDayFromEffective: p, owner: "Buyer" },
    { category: "Closing Prep", item: "Closing statement / prorations review", dueDayFromEffective: p, owner: "Buyer / Title Co." },
  ];
}
