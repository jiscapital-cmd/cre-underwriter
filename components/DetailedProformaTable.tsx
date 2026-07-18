"use client";

import { DetailedLineItems, computeDetailedProforma, DetailedProformaRow } from "@/lib/detailedProforma";
import { fmtUsd, fmtPct } from "@/lib/format";

type EditableKey = keyof DetailedLineItems;

// Maps each displayed row label to the field it edits (perUnit $) — rows not
// listed here are computed subtotals/percentages and stay read-only.
const PER_UNIT_EDIT_MAP: Record<string, EditableKey> = {
  "Net Rental Income / Gross Potential Rent": "gprPerUnit",
  "Tenant Assistance Payments": "tenantAssistancePerUnit",
  "Other Income": "otherIncomePerUnit",
  "Utility Reimbursements": "utilityReimbPerUnit",
  "Payroll & Benefits": "payrollPerUnit",
  "General & Administrative": "adminPerUnit",
  "Repairs & Maintenance": "repairsPerUnit",
  "Contract Services": "contractServicesPerUnit",
  "Advertising & Promotion": "advertisingPerUnit",
  "Utilities": "utilitiesPerUnit",
  "Insurance": "insurancePerUnit",
  "Property Taxes": "propertyTaxesPerUnit",
  "Other / Uncategorized Opex": "otherOpexPerUnit",
  "Replacement Reserves": "reservesPerUnit",
};

// Percent-based rows edit a *Pct field directly (not $/unit).
const PCT_EDIT_MAP: Record<string, EditableKey> = {
  "Projected Increase in Market Rents": "marketRentIncreasePct",
  "Less: Loss/Gain to Lease": "lossToLeasePct",
  "Vacancy Loss": "vacancyPct",
  "Concessions": "concessionsPct",
  "Bad Debt": "badDebtPct",
  "Models/Administrative Units": "modelsAdminPct",
  "Employee Units": "employeeUnitsPct",
  "Management Fee": "managementFeePct",
};

function Row({
  row,
  editable,
  onEditPerUnit,
  onEditPct,
}: {
  row: DetailedProformaRow;
  editable: boolean;
  onEditPerUnit?: (v: number) => void;
  onEditPct?: (v: number) => void;
}) {
  const perUnitKey = PER_UNIT_EDIT_MAP[row.label];
  const pctKey = PCT_EDIT_MAP[row.label];
  const isEconomicOcc = row.label === "Economic Occupancy (% of GPR)";

  return (
    <tr className={`border-b border-cardBorder ${row.bold ? "font-semibold" : ""}`}>
      <td className="py-1.5 pr-3 text-silver whitespace-nowrap">{row.label}</td>
      <td className="py-1.5 pr-3 text-right tabular-nums w-28">
        {editable && perUnitKey ? (
          <input
            type="number"
            className="input py-1 text-right"
            value={row.perUnit ?? 0}
            onChange={(e) => onEditPerUnit?.(parseFloat(e.target.value) || 0)}
          />
        ) : editable && pctKey ? (
          <div className="flex items-center gap-1 justify-end">
            <input
              type="number"
              step={0.1}
              className="input py-1 text-right"
              value={+(((row.note ? parseFloat(row.note) : 0)).toFixed(2))}
              onChange={(e) => onEditPct?.((parseFloat(e.target.value) || 0) / 100)}
            />
            <span className="text-silver text-xs">%</span>
          </div>
        ) : row.perUnit !== null ? (
          fmtUsd(row.perUnit)
        ) : (
          <span className="text-silver/60">{isEconomicOcc ? "" : row.note}</span>
        )}
      </td>
      <td className="py-1.5 text-right tabular-nums">{isEconomicOcc ? fmtPct(row.annual) : fmtUsd(row.annual)}</td>
    </tr>
  );
}

export default function DetailedProformaTable({
  title,
  detail,
  units,
  editable,
  onChange,
}: {
  title: string;
  detail: DetailedLineItems;
  units: number;
  editable: boolean;
  onChange?: (patch: Partial<DetailedLineItems>) => void;
}) {
  const result = computeDetailedProforma(detail, units);

  return (
    <div className="card overflow-x-auto">
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-xs text-silver mb-3">
        {editable ? "$/unit and % fields are editable — annual totals recalculate automatically. " : "Read-only. "}
        NOI below is net of replacement reserves; the Year 1-5 table further down reports NOI before reserves
        (reserves are deducted separately in Levered Cash Flow), so the two "NOI" figures won't match — both are
        correct under their own convention.
      </p>

      <div className="mb-2 label">Income</div>
      <table className="min-w-full text-sm mb-4">
        <thead>
          <tr className="text-left border-b border-cardBorder">
            <th className="py-1.5 pr-3 font-medium text-silver">Line Item</th>
            <th className="py-1.5 pr-3 font-medium text-silver text-right">$/Unit or %</th>
            <th className="py-1.5 font-medium text-silver text-right">Annual</th>
          </tr>
        </thead>
        <tbody>
          {result.incomeRows.map((row) => (
            <Row
              key={row.label}
              row={row}
              editable={editable}
              onEditPerUnit={(v) => onChange?.({ [PER_UNIT_EDIT_MAP[row.label]]: v } as Partial<DetailedLineItems>)}
              onEditPct={(v) => onChange?.({ [PCT_EDIT_MAP[row.label]]: v } as Partial<DetailedLineItems>)}
            />
          ))}
        </tbody>
      </table>

      <div className="mb-2 label">Operating Expenses</div>
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left border-b border-cardBorder">
            <th className="py-1.5 pr-3 font-medium text-silver">Line Item</th>
            <th className="py-1.5 pr-3 font-medium text-silver text-right">$/Unit or %</th>
            <th className="py-1.5 font-medium text-silver text-right">Annual</th>
          </tr>
        </thead>
        <tbody>
          {result.expenseRows.map((row) => (
            <Row
              key={row.label}
              row={row}
              editable={editable}
              onEditPerUnit={(v) => onChange?.({ [PER_UNIT_EDIT_MAP[row.label]]: v } as Partial<DetailedLineItems>)}
              onEditPct={(v) => onChange?.({ [PCT_EDIT_MAP[row.label]]: v } as Partial<DetailedLineItems>)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
