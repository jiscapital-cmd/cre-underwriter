"use client";

import { Demographics, MarketComps, RentComp, SalesComp, SupplyItem } from "@/lib/applyExtraction";

function EditableTable<T extends Record<string, any>>({
  title,
  rows,
  setRows,
  columns,
  emptyRow,
}: {
  title: string;
  rows: T[];
  setRows: (r: T[]) => void;
  columns: { key: keyof T; label: string; type?: string }[];
  emptyRow: T;
}) {
  function updateCell(idx: number, key: keyof T, value: string) {
    const next = [...rows];
    const isNumeric = typeof emptyRow[key] === "number";
    next[idx] = { ...next[idx], [key]: isNumeric ? parseFloat(value) || 0 : value };
    setRows(next);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-medium text-sm">{title}</h3>
        <button
          onClick={() => setRows([...rows, { ...emptyRow }])}
          className="text-xs font-medium text-ink hover:underline"
        >
          + Add row
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left border-b border-cardBorder">
              {columns.map((c) => (
                <th key={String(c.key)} className="py-1.5 pr-3 font-medium text-silver">
                  {c.label}
                </th>
              ))}
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-cardBorder">
                {columns.map((c) => (
                  <td key={String(c.key)} className="py-1 pr-3">
                    <input
                      className="input py-1"
                      value={row[c.key] ?? ""}
                      onChange={(e) => updateCell(i, c.key, e.target.value)}
                    />
                  </td>
                ))}
                <td>
                  <button
                    onClick={() => setRows(rows.filter((_, idx) => idx !== i))}
                    className="text-xs text-silver/70 hover:text-red-300"
                  >
                    remove
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={columns.length + 1} className="py-3 text-silver/70 text-sm italic">
                  No data yet — upload a broker OM on the Inputs tab and click Apply to Model, or add rows manually.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function MarketCompsTab({
  comps,
  onChange,
}: {
  comps: MarketComps;
  onChange: (patch: Partial<MarketComps>) => void;
}) {
  const { salesComps, rentComps, supplyPipeline, demographics } = comps;

  return (
    <div className="space-y-6">
      <div className="card">
        <EditableTable<SalesComp>
          title="Sales Comps"
          rows={salesComps}
          setRows={(rows) => onChange({ salesComps: rows })}
          emptyRow={{ property: "", units: 0, salePrice: 0, pricePerUnit: 0, capRate: 0, saleDate: "" }}
          columns={[
            { key: "property", label: "Property" },
            { key: "units", label: "Units" },
            { key: "salePrice", label: "Sale Price" },
            { key: "pricePerUnit", label: "$/Unit" },
            { key: "capRate", label: "Cap Rate" },
            { key: "saleDate", label: "Sale Date" },
          ]}
        />
      </div>

      <div className="card">
        <EditableTable<RentComp>
          title="Rent Comps"
          rows={rentComps}
          setRows={(rows) => onChange({ rentComps: rows })}
          emptyRow={{ property: "", unitType: "", avgSF: 0, askingRent: 0, rentPerSF: 0 }}
          columns={[
            { key: "property", label: "Property" },
            { key: "unitType", label: "Unit Type" },
            { key: "avgSF", label: "Avg SF" },
            { key: "askingRent", label: "Asking Rent" },
            { key: "rentPerSF", label: "$/SF" },
          ]}
        />
      </div>

      <div className="card">
        <EditableTable<SupplyItem>
          title="Supply Pipeline"
          rows={supplyPipeline}
          setRows={(rows) => onChange({ supplyPipeline: rows })}
          emptyRow={{ project: "", units: 0, deliveryDate: "", distanceMiles: 0 }}
          columns={[
            { key: "project", label: "Project" },
            { key: "units", label: "Units" },
            { key: "deliveryDate", label: "Delivery" },
            { key: "distanceMiles", label: "Miles Away" },
          ]}
        />
      </div>

      <div className="card">
        <h3 className="font-medium text-sm mb-3">Demographics (1-3 mile radius)</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {(
            [
              ["populationGrowth1mi", "Population Growth (5yr)"],
              ["medianHHIncome", "Median HH Income"],
              ["unemploymentRate", "Unemployment Rate"],
              ["submarketOccupancy", "Submarket Occupancy"],
              ["submarketRentGrowthTTM", "Submarket Rent Growth (TTM)"],
            ] as const
          ).map(([key, label]) => (
            <label key={key}>
              <span className="label">{label}</span>
              <input
                className="input mt-1"
                value={demographics[key as keyof Demographics]}
                onChange={(e) => onChange({ demographics: { ...demographics, [key]: e.target.value } })}
                placeholder="—"
              />
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
