"use client";

import { DealInputs, SensitivityCell } from "@/lib/underwriting";
import { ScenarioResult } from "@/lib/scenarios";
import { BreakEven } from "@/lib/scenarios";
import { fmtPct, fmtUsd, fmtX } from "@/lib/format";
import SensitivityGrid from "./SensitivityGrid";

const SCENARIO_COLOR: Record<string, string> = {
  "Worst Case": "border-red-500/30 bg-red-500/10",
  "Base Case": "border-cardBorder bg-card",
  "Best Case": "border-emerald-500/30 bg-emerald-500/10",
};

export default function SensitivityScenariosTab({
  grid,
  scenarios,
  breakEven,
  inputs,
}: {
  grid: SensitivityCell[][];
  scenarios: ScenarioResult[];
  breakEven: BreakEven;
  inputs: DealInputs;
}) {
  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="font-semibold mb-1">Best / Base / Worst Case</h2>
        <p className="text-sm text-silver mb-4">
          Worst Case: rent growth -2pts, expense growth +1.5pts, vacancy +3pts, exit cap +75bps, rate +100bps.
          Best Case: mirror-image favorable shifts.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {scenarios.map((s) => (
            <div key={s.name} className={`border rounded-lg p-4 ${SCENARIO_COLOR[s.name]}`}>
              <div className="font-semibold text-sm mb-3">{s.name}</div>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-silver">Levered IRR</dt>
                  <dd className="font-medium">{fmtPct(s.returns.leveredIRR)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-silver">Equity Multiple</dt>
                  <dd className="font-medium">{fmtX(s.returns.equityMultiple)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-silver">Year 1 CoC</dt>
                  <dd className="font-medium">{fmtPct(s.returns.yearOneCoC)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-silver">Year 1 DSCR</dt>
                  <dd className="font-medium">{s.returns.yearOneDSCR.toFixed(2)}x</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-silver">Exit Value</dt>
                  <dd className="font-medium">{fmtUsd(s.returns.exitValue)}</dd>
                </div>
              </dl>
            </div>
          ))}
        </div>
      </div>

      <SensitivityGrid grid={grid} />

      <div className="card">
        <h2 className="font-semibold mb-4">Break-Even Analysis</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <div className="label">Break-Even Occupancy</div>
            <div className="stat-value">{fmtPct(breakEven.breakEvenOccupancyPct)}</div>
            <div className="text-xs text-silver mt-1">Occupancy needed to cover opex + debt service</div>
          </div>
          <div>
            <div className="label">Break-Even Rent / Unit / Mo</div>
            <div className="stat-value">{fmtUsd(breakEven.breakEvenRentPerUnitMonthly)}</div>
            <div className="text-xs text-silver mt-1">At underwritten {fmtPct(1 - inputs.vacancyRate)} occupancy</div>
          </div>
          <div>
            <div className="label">Margin of Safety</div>
            <div className={`stat-value ${breakEven.marginOfSafetyOccPts < 10 ? "text-red-300" : "text-emerald-300"}`}>
              {breakEven.marginOfSafetyOccPts.toFixed(1)} pts
            </div>
            <div className="text-xs text-silver mt-1">Underwritten occupancy minus break-even occupancy</div>
          </div>
        </div>
      </div>
    </div>
  );
}
