"use client";

import { DealInputs } from "@/lib/underwriting";
import NumberField from "./NumberField";

type Props = {
  inputs: DealInputs;
  onChange: (patch: Partial<DealInputs>) => void;
};

export default function InputsForm({ inputs, onChange }: Props) {
  return (
    <div className="card space-y-5">
      <h2 className="font-semibold">Deal Inputs</h2>

      <div className="grid grid-cols-2 gap-3">
        <label className="col-span-2">
          <span className="label">Property Name</span>
          <input
            className="input mt-1"
            value={inputs.propertyName}
            onChange={(e) => onChange({ propertyName: e.target.value })}
          />
        </label>
        <label>
          <span className="label">Asset Type</span>
          <select
            className="input mt-1"
            value={inputs.assetType}
            onChange={(e) => onChange({ assetType: e.target.value })}
          >
            {["Multifamily", "Office", "Retail", "Industrial", "Self-Storage", "Mixed-Use"].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <NumberField label="Units / SF Count" value={inputs.unitCount} onChange={(v) => onChange({ unitCount: v })} />
      </div>

      <div>
        <div className="label mb-2">Acquisition</div>
        <div className="grid grid-cols-2 gap-3">
          <NumberField label="Purchase Price" prefix="$" value={inputs.purchasePrice} step={10000} onChange={(v) => onChange({ purchasePrice: v })} />
          <NumberField label="Closing Costs" percent value={inputs.closingCostsPct} onChange={(v) => onChange({ closingCostsPct: v })} />
          <NumberField label="Hold Period (Years)" value={inputs.holdPeriodYears} onChange={(v) => onChange({ holdPeriodYears: Math.max(1, Math.min(10, Math.round(v))) })} />
          <NumberField label="Exit Cap Rate" percent value={inputs.exitCapRate} onChange={(v) => onChange({ exitCapRate: v })} />
          <NumberField label="Sale Costs" percent value={inputs.saleCostsPct} onChange={(v) => onChange({ saleCostsPct: v })} />
        </div>
      </div>

      <div>
        <div className="label mb-2">Growth & Operating Assumptions</div>
        <div className="grid grid-cols-2 gap-3">
          <NumberField label="Rent Growth Rate" percent value={inputs.rentGrowthRate} onChange={(v) => onChange({ rentGrowthRate: v })} />
          <NumberField label="Expense Growth Rate" percent value={inputs.expenseGrowthRate} onChange={(v) => onChange({ expenseGrowthRate: v })} />
          <NumberField label="Vacancy Rate" percent value={inputs.vacancyRate} onChange={(v) => onChange({ vacancyRate: v })} />
          <NumberField label="Other Income Growth" percent value={inputs.otherIncomeGrowthRate} onChange={(v) => onChange({ otherIncomeGrowthRate: v })} />
          <NumberField label="Management Fee (% of EGI)" percent value={inputs.managementFeePct} onChange={(v) => onChange({ managementFeePct: v })} />
          <NumberField label="Cap Reserve ($/unit/yr)" prefix="$" value={inputs.capReservePerUnit} onChange={(v) => onChange({ capReservePerUnit: v })} />
        </div>
      </div>

      <div>
        <div className="label mb-2">Year 1 Operating Basis</div>
        <div className="grid grid-cols-2 gap-3">
          <NumberField label="Market GPR (annual)" prefix="$" value={inputs.marketGPRAnnual} step={1000} onChange={(v) => onChange({ marketGPRAnnual: v })} />
          <NumberField label="Other Income (annual)" prefix="$" value={inputs.otherIncomeAnnual} step={1000} onChange={(v) => onChange({ otherIncomeAnnual: v })} />
          <NumberField label="Opex Year 1 (excl. mgmt fee)" prefix="$" value={inputs.opexYear1Annual} step={1000} onChange={(v) => onChange({ opexYear1Annual: v })} />
        </div>
      </div>

      <div>
        <div className="label mb-2">Debt & Financing</div>
        <div className="grid grid-cols-2 gap-3">
          <NumberField label="LTV" percent value={inputs.ltv} onChange={(v) => onChange({ ltv: v })} />
          <NumberField label="Interest Rate" percent value={inputs.interestRate} onChange={(v) => onChange({ interestRate: v })} />
          <NumberField label="Amortization (years)" value={inputs.amortYears} onChange={(v) => onChange({ amortYears: v })} />
          <NumberField label="Interest-Only Period (years)" value={inputs.ioYears} onChange={(v) => onChange({ ioYears: v })} />
          <NumberField label="Loan Fees" percent value={inputs.loanFeesPct} onChange={(v) => onChange({ loanFeesPct: v })} />
        </div>
      </div>
    </div>
  );
}
