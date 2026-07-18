import { DealInputs } from "./underwriting";

export type Extracted = Record<string, any>;
export type ExtractionEntry = { docType: string; extracted: Extracted };

/** Claude sometimes returns numbers as formatted strings ("$1,234,000", "3%"). */
function toNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const cleaned = v.replace(/[$,%\s]/g, "");
    const n = parseFloat(cleaned);
    if (!Number.isFinite(n)) return null;
    // If the original had a % sign, treat as a decimal rate.
    return /%/.test(v) ? n / 100 : n;
  }
  return null;
}

function sumField(rows: any[] | undefined, key: string): number | null {
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const total = rows.reduce((sum, row) => sum + (toNumber(row?.[key]) ?? 0), 0);
  return total > 0 ? total : null;
}

function isT12Doc(docType: string): boolean {
  const d = docType.toLowerCase();
  return d.includes("t-12") || d.includes("t12") || d.includes("trailing");
}

type OpexCategory =
  | "payrollPerUnit"
  | "adminPerUnit"
  | "repairsPerUnit"
  | "contractServicesPerUnit"
  | "advertisingPerUnit"
  | "utilitiesPerUnit"
  | "insurancePerUnit"
  | "propertyTaxesPerUnit"
  | "otherOpexPerUnit";

const CATEGORY_PATTERNS: [RegExp, OpexCategory][] = [
  [/payroll|salar|\bwage|benefit|personnel|\bstaff/i, "payrollPerUnit"],
  [/\btax/i, "propertyTaxesPerUnit"],
  [/insur/i, "insurancePerUnit"],
  [/util|electric|\bwater\b|sewer|\bgas\b|trash|waste|cable/i, "utilitiesPerUnit"],
  [/repair|maintenance|make.?ready|turnover|\bhvac\b|plumbing/i, "repairsPerUnit"],
  [/contract|landscap|\bpool\b|pest|elevator|security|janitorial|\bclean/i, "contractServicesPerUnit"],
  [/advertis|marketing|promotion|leasing commission/i, "advertisingPerUnit"],
  [/admin|general|\boffice\b|legal|accounting|professional fee|bank charge|training/i, "adminPerUnit"],
];

function categorizeLabel(label: string): OpexCategory {
  for (const [pattern, category] of CATEGORY_PATTERNS) {
    if (pattern.test(label)) return category;
  }
  return "otherOpexPerUnit";
}

/** Sums opex line items into per-unit category buckets by keyword-matching
 * each label (e.g. "Payroll & Benefits" → payrollPerUnit). Anything that
 * doesn't match a known category falls into otherOpexPerUnit, so totals are
 * always preserved even when a label can't be classified. */
function categorizeOpexLineItems(items: any[], units: number): Partial<Record<OpexCategory, number>> {
  const sums: Partial<Record<OpexCategory, number>> = {};
  for (const item of items) {
    const label = String(item?.label ?? "");
    const amt = toNumber(item?.annualAmount) ?? 0;
    if (amt === 0) continue;
    const category = categorizeLabel(label);
    sums[category] = (sums[category] ?? 0) + amt;
  }
  const perUnit: Partial<Record<OpexCategory, number>> = {};
  for (const [category, total] of Object.entries(sums)) {
    perUnit[category as OpexCategory] = (total as number) / units;
  }
  return perUnit;
}

/** Merges every extracted document's fields onto a base set of inputs.
 *
 * Writes into the itemized t12Detail / year1Detail $/unit tables (not the
 * flat aggregate fields, which are now *derived* from those tables via
 * syncDetailToAggregates — the caller must run that after this returns, or
 * the next detail-table edit will silently overwrite these values).
 *
 * T-12 uploads populate t12Detail, kept separate from the Year 1 pro forma
 * basis: T-12 gross potential rent is trailing/actual, not market rent, so
 * blending it into Year 1 would understate the mark-to-market upside a rent
 * roll or OM would otherwise show. Opex line items get keyword-categorized
 * into the same payroll/repairs/utilities/etc. buckets Year 1 uses, so both
 * columns are comparable line-by-line instead of T-12 dumping everything
 * into one lump sum. */
export function mergeExtractions(base: DealInputs, entries: ExtractionEntry[]): DealInputs {
  let inputs = { ...base };

  for (const { docType, extracted: ex } of entries) {
    const patch: Partial<DealInputs> = {};

    if (typeof ex.propertyName === "string" && ex.propertyName.trim()) patch.propertyName = ex.propertyName;
    if (typeof ex.assetType === "string" && ex.assetType.trim()) patch.assetType = ex.assetType;

    const purchasePrice = toNumber(ex.purchasePrice);
    if (purchasePrice !== null) patch.purchasePrice = purchasePrice;

    const unitCount = toNumber(ex.unitCount) ?? (Array.isArray(ex.rentRoll) && ex.rentRoll.length > 0
      ? ex.rentRoll.reduce((s: number, r: any) => s + (toNumber(r?.unitCount) ?? 0), 0)
      : null);
    if (unitCount) patch.unitCount = unitCount;

    // `?? ` only falls through on null/undefined — an empty/zero unitCount
    // here must still fall back to the deal's existing unit count, not 0.
    const units = unitCount && unitCount > 0 ? unitCount : inputs.unitCount;

    const otherIncome = toNumber(ex.otherIncomeAnnual);
    const egi = toNumber(ex.egiAnnual);
    const opexTotal = toNumber(ex.opexYear1Annual) ?? sumField(ex.opexLineItems, "annualAmount");
    const mgmtFeePct = toNumber(ex.managementFeePct);
    const vacancyRate = toNumber(ex.vacancyRate);
    const vacancyLossAnnual = toNumber(ex.vacancyLossAnnual);
    const hasLineItems = Array.isArray(ex.opexLineItems) && ex.opexLineItems.length > 0;

    if (isT12Doc(docType)) {
      // GPR must come from THIS document only — never borrow a market-rent
      // figure computed for a different doc type, and never silently invent
      // a number. Derive from EGI + vacancy loss when a T-12 doesn't state
      // gross potential rent as its own line.
      const t12GPR =
        toNumber(ex.currentGPRAnnual) ??
        (egi !== null && vacancyLossAnnual !== null ? egi + Math.abs(vacancyLossAnnual) - (otherIncome ?? 0) : null);

      if (t12GPR && units > 0) {
        const vacancyPct =
          vacancyRate ?? (vacancyLossAnnual !== null ? Math.abs(vacancyLossAnnual) / t12GPR : inputs.t12Detail.vacancyPct);

        const categorized = hasLineItems ? categorizeOpexLineItems(ex.opexLineItems, units) : {};
        const categorizedTotal = Object.values(categorized).reduce((a: number, b) => a + (b as number) * units, 0);
        const leftoverOpex = hasLineItems ? Math.max(0, (opexTotal ?? categorizedTotal) - categorizedTotal) : opexTotal ?? 0;

        patch.t12Detail = {
          ...inputs.t12Detail,
          gprPerUnit: t12GPR / units,
          vacancyPct,
          otherIncomePerUnit: (otherIncome ?? 0) / units,
          payrollPerUnit: categorized.payrollPerUnit ?? inputs.t12Detail.payrollPerUnit,
          adminPerUnit: categorized.adminPerUnit ?? inputs.t12Detail.adminPerUnit,
          repairsPerUnit: categorized.repairsPerUnit ?? inputs.t12Detail.repairsPerUnit,
          contractServicesPerUnit: categorized.contractServicesPerUnit ?? inputs.t12Detail.contractServicesPerUnit,
          advertisingPerUnit: categorized.advertisingPerUnit ?? inputs.t12Detail.advertisingPerUnit,
          utilitiesPerUnit: categorized.utilitiesPerUnit ?? inputs.t12Detail.utilitiesPerUnit,
          insurancePerUnit: categorized.insurancePerUnit ?? inputs.t12Detail.insurancePerUnit,
          propertyTaxesPerUnit: categorized.propertyTaxesPerUnit ?? inputs.t12Detail.propertyTaxesPerUnit,
          otherOpexPerUnit: leftoverOpex / units,
          managementFeePct: mgmtFeePct ?? inputs.t12Detail.managementFeePct,
        };
      }
    } else if (units > 0) {
      // Rent Roll / Offering Memorandum: these feed the Year 1 pro forma basis.
      const marketGPR =
        toNumber(ex.marketGPRAnnual) ??
        (Array.isArray(ex.rentRoll) && ex.rentRoll.length > 0
          ? ex.rentRoll.reduce(
              (s: number, r: any) => s + (toNumber(r?.marketRentMonthly) ?? 0) * (toNumber(r?.unitCount) ?? 0) * 12,
              0
            )
          : null);

      patch.year1Detail = { ...inputs.year1Detail };
      if (marketGPR) patch.year1Detail.gprPerUnit = marketGPR / units;
      if (otherIncome !== null) patch.year1Detail.otherIncomePerUnit = otherIncome / units;
      if (mgmtFeePct !== null) patch.year1Detail.managementFeePct = mgmtFeePct;
      if (vacancyRate !== null) patch.year1Detail.vacancyPct = vacancyRate;

      if (hasLineItems) {
        const categorized = categorizeOpexLineItems(ex.opexLineItems, units);
        const categorizedTotal = Object.values(categorized).reduce((a: number, b) => a + (b as number) * units, 0);
        const leftoverOpex = Math.max(0, (opexTotal ?? categorizedTotal) - categorizedTotal);
        Object.assign(patch.year1Detail, categorized, { otherOpexPerUnit: leftoverOpex / units });
      } else if (opexTotal !== null) {
        patch.year1Detail.otherOpexPerUnit = opexTotal / units;
      }
    }

    inputs = { ...inputs, ...patch };
  }

  return inputs;
}

export type SalesComp = { property: string; units: number; salePrice: number; pricePerUnit: number; capRate: number; saleDate: string };
export type RentComp = { property: string; unitType: string; avgSF: number; askingRent: number; rentPerSF: number };
export type SupplyItem = { project: string; units: number; deliveryDate: string; distanceMiles: number };
export type Demographics = {
  populationGrowth1mi: string;
  medianHHIncome: string;
  unemploymentRate: string;
  submarketOccupancy: string;
  submarketRentGrowthTTM: string;
};

export type MarketComps = {
  salesComps: SalesComp[];
  rentComps: RentComp[];
  supplyPipeline: SupplyItem[];
  demographics: Demographics;
};

export const EMPTY_MARKET_COMPS: MarketComps = {
  salesComps: [],
  rentComps: [],
  supplyPipeline: [],
  demographics: {
    populationGrowth1mi: "",
    medianHHIncome: "",
    unemploymentRate: "",
    submarketOccupancy: "",
    submarketRentGrowthTTM: "",
  },
};

function str(v: unknown): string {
  return v === null || v === undefined ? "" : String(v);
}

/** Pulls sales/rent comps, supply pipeline, and demographics out of every
 * extracted document (typically only present in an Offering Memorandum) and
 * appends them onto the existing Market & Comps tables. */
export function mergeMarketComps(base: MarketComps, entries: ExtractionEntry[]): MarketComps {
  let comps: MarketComps = {
    salesComps: [...base.salesComps],
    rentComps: [...base.rentComps],
    supplyPipeline: [...base.supplyPipeline],
    demographics: { ...base.demographics },
  };

  for (const { extracted: ex } of entries) {
    if (Array.isArray(ex.salesComps)) {
      comps.salesComps.push(
        ...ex.salesComps.map((c: any) => ({
          property: str(c?.property),
          units: toNumber(c?.units) ?? 0,
          salePrice: toNumber(c?.salePrice) ?? 0,
          pricePerUnit: toNumber(c?.pricePerUnit) ?? 0,
          capRate: toNumber(c?.capRate) ?? 0,
          saleDate: str(c?.saleDate),
        }))
      );
    }
    if (Array.isArray(ex.rentComps)) {
      comps.rentComps.push(
        ...ex.rentComps.map((c: any) => ({
          property: str(c?.property),
          unitType: str(c?.unitType),
          avgSF: toNumber(c?.avgSF) ?? 0,
          askingRent: toNumber(c?.askingRent) ?? 0,
          rentPerSF: toNumber(c?.rentPerSF) ?? 0,
        }))
      );
    }
    if (Array.isArray(ex.supplyPipeline)) {
      comps.supplyPipeline.push(
        ...ex.supplyPipeline.map((c: any) => ({
          project: str(c?.project),
          units: toNumber(c?.units) ?? 0,
          deliveryDate: str(c?.deliveryDate),
          distanceMiles: toNumber(c?.distanceMiles) ?? 0,
        }))
      );
    }
    if (ex.demographics && typeof ex.demographics === "object") {
      const d = ex.demographics;
      comps.demographics = {
        populationGrowth1mi: str(d.populationGrowth1mi) || comps.demographics.populationGrowth1mi,
        medianHHIncome: str(d.medianHHIncome) || comps.demographics.medianHHIncome,
        unemploymentRate: str(d.unemploymentRate) || comps.demographics.unemploymentRate,
        submarketOccupancy: str(d.submarketOccupancy) || comps.demographics.submarketOccupancy,
        submarketRentGrowthTTM: str(d.submarketRentGrowthTTM) || comps.demographics.submarketRentGrowthTTM,
      };
    }
  }

  return comps;
}
