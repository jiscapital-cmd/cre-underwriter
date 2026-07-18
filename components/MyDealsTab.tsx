"use client";

import { useEffect, useState } from "react";
import { computeDebt, computeProforma, computeReturns, DealInputs, hydrateInputs, offerPrice } from "@/lib/underwriting";
import { fmtPct, fmtUsd, fmtX } from "@/lib/format";

type DealRow = {
  id: string;
  created_at: string;
  updated_at: string;
  property_name: string;
  inputs: Partial<DealInputs>;
};

type DealSummary = DealRow & {
  hydrated: DealInputs;
  irr: number | null;
  equityMultiple: number;
  capRate: number;
};

function summarize(row: DealRow): DealSummary {
  const hydrated = hydrateInputs(row.inputs);
  const debt = computeDebt(hydrated);
  const proforma = computeProforma(hydrated, debt);
  const returns = computeReturns(hydrated, debt, proforma);
  return { ...row, hydrated, irr: returns.leveredIRR, equityMultiple: returns.equityMultiple, capRate: returns.goingInCapRate };
}

export default function MyDealsTab({
  currentDealId,
  onLoad,
  refreshToken,
}: {
  currentDealId: string | null;
  onLoad: (id: string, inputs: DealInputs) => void;
  refreshToken: number;
}) {
  const [deals, setDeals] = useState<DealSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function fetchDeals() {
    setError(null);
    try {
      const res = await fetch("/api/deals");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load deals");
      setDeals((json.deals as DealRow[]).map(summarize));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load deals");
    }
  }

  useEffect(() => {
    fetchDeals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshToken]);

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This can't be undone.`)) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/deals/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Delete failed");
      setDeals((prev) => (prev ? prev.filter((d) => d.id !== id) : prev));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusyId(null);
    }
  }

  function location(inputs: Partial<DealInputs>): string {
    const parts = [inputs.propertyCity, inputs.propertyState].filter(Boolean);
    if (parts.length) return parts.join(", ");
    if (inputs.propertyAddress) return inputs.propertyAddress;
    return "—";
  }

  return (
    <div className="card overflow-x-auto">
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-semibold">My Deals</h2>
        <button onClick={fetchDeals} className="text-xs font-medium text-ink hover:underline">
          Refresh
        </button>
      </div>
      <p className="text-sm text-silver mb-4">Load a saved deal to continue working on it, or delete ones you no longer need.</p>

      {error && <p className="text-sm text-red-300 mb-3">{error}</p>}

      {deals === null && !error && <p className="text-sm text-silver">Loading...</p>}

      {deals && deals.length === 0 && (
        <p className="text-sm text-silver italic">No saved deals yet — click Save Deal from any tab to save your current work.</p>
      )}

      {deals && deals.length > 0 && (
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left border-b border-cardBorder">
              <th className="py-2 pr-3 font-medium text-silver">Property</th>
              <th className="py-2 pr-3 font-medium text-silver">Location</th>
              <th className="py-2 pr-3 font-medium text-silver text-right">Units</th>
              <th className="py-2 pr-3 font-medium text-silver text-right">Purchase Price</th>
              <th className="py-2 pr-3 font-medium text-silver text-right">Offer Price</th>
              <th className="py-2 pr-3 font-medium text-silver text-right">Going-In Cap</th>
              <th className="py-2 pr-3 font-medium text-silver text-right">Levered IRR</th>
              <th className="py-2 pr-3 font-medium text-silver text-right">Equity Multiple</th>
              <th className="py-2 pr-3 font-medium text-silver">Updated</th>
              <th className="py-2 font-medium text-silver"></th>
            </tr>
          </thead>
          <tbody>
            {deals.map((d) => (
              <tr key={d.id} className={`border-b border-cardBorder ${d.id === currentDealId ? "bg-gold/5" : ""}`}>
                <td className="py-2 pr-3 font-medium whitespace-nowrap">
                  {d.property_name}
                  {d.id === currentDealId && <span className="ml-2 text-xs text-gold">(open)</span>}
                </td>
                <td className="py-2 pr-3 text-silver whitespace-nowrap">{location(d.hydrated)}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{d.hydrated.unitCount}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{fmtUsd(d.hydrated.purchasePrice)}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{fmtUsd(offerPrice(d.hydrated))}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{fmtPct(d.capRate)}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{fmtPct(d.irr)}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{fmtX(d.equityMultiple)}</td>
                <td className="py-2 pr-3 text-silver whitespace-nowrap">
                  {new Date(d.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </td>
                <td className="py-2 whitespace-nowrap">
                  <button
                    onClick={() => onLoad(d.id, d.hydrated)}
                    className="text-xs font-medium text-ink hover:underline mr-3"
                  >
                    Load
                  </button>
                  <button
                    onClick={() => handleDelete(d.id, d.property_name)}
                    disabled={busyId === d.id}
                    className="text-xs font-medium text-red-300 hover:underline disabled:opacity-50"
                  >
                    {busyId === d.id ? "Deleting..." : "Delete"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
