"use client";

import { useState } from "react";
import { DealInputs, YearLine, computeDebt } from "@/lib/underwriting";
import { evaluateDebtPrograms, computeRefinanceAnalysis } from "@/lib/debtScenarios";
import { fmtPct, fmtUsd } from "@/lib/format";
import NumberField from "./NumberField";

export default function DebtFinancingTab({ inputs, proforma }: { inputs: DealInputs; proforma: YearLine[] }) {
  const results = evaluateDebtPrograms(inputs);

  const [refiYear, setRefiYear] = useState(3);
  const [refiCapRate, setRefiCapRate] = useState(inputs.exitCapRate);
  const [refiLTV, setRefiLTV] = useState(0.7);

  const currentDebt = computeDebt(inputs);
  const clampedRefiYear = Math.min(Math.max(1, Math.round(refiYear)), inputs.holdPeriodYears);
  const originalBalanceAtRefi =
    clampedRefiYear <= inputs.ioYears
      ? currentDebt.loanAmount
      : Math.max(0, currentDebt.loanAmount - (currentDebt.loanAmount / inputs.amortYears) * (clampedRefiYear - inputs.ioYears));

  const refi = computeRefinanceAnalysis(inputs, proforma, clampedRefiYear, refiCapRate, refiLTV, originalBalanceAtRefi);

  return (
    <div className="space-y-6">
      <div className="card overflow-x-auto">
        <h2 className="font-semibold mb-1">Debt Program Comparison</h2>
        <p className="text-sm text-silver mb-4">Indicative terms — replace with actual term sheets once received.</p>
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left border-b border-cardBorder">
              <th className="py-2 pr-3 font-medium text-silver">Program</th>
              <th className="py-2 pr-3 font-medium text-silver text-right">LTV</th>
              <th className="py-2 pr-3 font-medium text-silver text-right">Rate</th>
              <th className="py-2 pr-3 font-medium text-silver text-right">Amort</th>
              <th className="py-2 pr-3 font-medium text-silver text-right">IO Yrs</th>
              <th className="py-2 pr-3 font-medium text-silver text-right">Loan Amount</th>
              <th className="py-2 pr-3 font-medium text-silver text-right">Yr1 DSCR</th>
              <th className="py-2 pr-3 font-medium text-silver text-right">Debt Yield</th>
              <th className="py-2 font-medium text-silver">Notes</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r) => (
              <tr key={r.program.name} className="border-b border-cardBorder">
                <td className="py-2 pr-3 font-medium">{r.program.name}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{fmtPct(r.program.ltv, 0)}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{fmtPct(r.program.interestRate, 2)}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{r.program.amortYears}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{r.program.ioYears}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{fmtUsd(r.debt.loanAmount)}</td>
                <td className={`py-2 pr-3 text-right tabular-nums font-medium ${r.yearOneDSCR < 1.2 ? "text-red-300" : ""}`}>
                  {r.yearOneDSCR.toFixed(2)}x
                </td>
                <td className="py-2 pr-3 text-right tabular-nums">{fmtPct(r.debtYield)}</td>
                <td className="py-2 text-silver min-w-[240px]">{r.program.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2 className="font-semibold mb-4">Refinance Analysis</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-5">
          <NumberField label="Refinance Year" value={refiYear} onChange={setRefiYear} />
          <NumberField label="Refinance Cap Rate" percent value={refiCapRate} onChange={setRefiCapRate} />
          <NumberField label="Refinance LTV" percent value={refiLTV} onChange={setRefiLTV} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-cardBorder pt-4">
          <div>
            <div className="label">Stabilized NOI (Yr {clampedRefiYear})</div>
            <div className="stat-value text-lg">{fmtUsd(refi.stabilizedNOI)}</div>
          </div>
          <div>
            <div className="label">Refinance Value</div>
            <div className="stat-value text-lg">{fmtUsd(refi.refinanceValue)}</div>
          </div>
          <div>
            <div className="label">New Loan Amount</div>
            <div className="stat-value text-lg">{fmtUsd(refi.newLoanAmount)}</div>
          </div>
          <div>
            <div className="label">Net Proceeds vs. Original Loan</div>
            <div className={`stat-value text-lg ${refi.refinanceProceeds >= 0 ? "text-emerald-300" : "text-red-300"}`}>
              {fmtUsd(refi.refinanceProceeds)}
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="font-semibold mb-3">Leverage Constraints</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <div className="label">Max LTV Constraint</div>
            <div className="font-medium">65-75% typical for stabilized multifamily</div>
          </div>
          <div>
            <div className="label">Min DSCR Constraint</div>
            <div className="font-medium">1.20x-1.25x typical agency minimum</div>
          </div>
          <div>
            <div className="label">Min Debt Yield Constraint</div>
            <div className="font-medium">7-9% typical, lender-dependent</div>
          </div>
        </div>
      </div>
    </div>
  );
}
