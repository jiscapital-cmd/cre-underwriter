"use client";

import { YearLine } from "@/lib/underwriting";
import { fmtUsd } from "@/lib/format";

const ROWS: { key: keyof YearLine; label: string }[] = [
  { key: "gpr", label: "Gross Potential Rent" },
  { key: "vacancyLoss", label: "Vacancy & Credit Loss" },
  { key: "otherIncome", label: "Other Income" },
  { key: "egi", label: "Effective Gross Income" },
  { key: "opex", label: "Operating Expenses" },
  { key: "managementFee", label: "Management Fee" },
  { key: "capReserve", label: "Capital Reserves" },
  { key: "noi", label: "Net Operating Income" },
  { key: "debtService", label: "Debt Service" },
  { key: "leveredCF", label: "Levered Cash Flow" },
];

export default function ProformaTable({ proforma, t12 }: { proforma: YearLine[]; t12?: YearLine | null }) {
  return (
    <div className="card overflow-x-auto">
      <h2 className="font-semibold mb-1">Proforma</h2>
      {t12 && (
        <p className="text-sm text-silver mb-4">
          T-12 shows trailing-actual figures as reported — it is not a projection and doesn't feed the Year 1-5 growth
          formulas, so you can compare underwritten assumptions against actual performance.
        </p>
      )}
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left border-b border-cardBorder">
            <th className="py-2 pr-4 font-medium text-silver">Line Item</th>
            {t12 && (
              <th className="py-2 px-3 font-medium text-gold text-right border-r border-cardBorder">
                T-12 (Actual)
              </th>
            )}
            {proforma.map((l) => (
              <th key={l.year} className="py-2 px-3 font-medium text-silver text-right">
                Year {l.year}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row) => (
            <tr
              key={row.key}
              className={`border-b border-cardBorder ${
                row.key === "noi" || row.key === "leveredCF" ? "font-semibold" : ""
              }`}
            >
              <td className="py-1.5 pr-4 text-silver">{row.label}</td>
              {t12 && (
                <td className="py-1.5 px-3 text-right tabular-nums border-r border-cardBorder text-gold/90">
                  {row.key === "debtService" || row.key === "capReserve" ? "—" : fmtUsd(t12[row.key] as number)}
                </td>
              )}
              {proforma.map((l) => (
                <td key={l.year} className="py-1.5 px-3 text-right tabular-nums">
                  {fmtUsd(l[row.key] as number)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
