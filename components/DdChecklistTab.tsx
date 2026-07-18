"use client";

import { useState } from "react";
import { DDItem } from "@/lib/ddChecklist";

export default function DdChecklistTab({ items, ddPeriodDays }: { items: DDItem[]; ddPeriodDays: number }) {
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const categories = Array.from(new Set(items.map((i) => i.category)));
  const doneCount = Object.values(checked).filter(Boolean).length;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-semibold">Due Diligence Checklist & Timeline</h2>
        <span className="text-sm text-silver">
          {doneCount}/{items.length} complete · {ddPeriodDays}-day DD period
        </span>
      </div>
      <p className="text-sm text-silver mb-4">Due dates shown as days from the LOI/PSA effective date.</p>

      {categories.map((cat) => (
        <div key={cat} className="mb-5">
          <div className="label mb-2">{cat}</div>
          <div className="space-y-1.5">
            {items
              .map((item, idx) => ({ item, idx }))
              .filter(({ item }) => item.category === cat)
              .map(({ item, idx }) => (
                <label key={idx} className="flex items-center gap-3 text-sm border border-cardBorder rounded-md px-3 py-2 hover:bg-panel/40">
                  <input
                    type="checkbox"
                    checked={!!checked[idx]}
                    onChange={(e) => setChecked((c) => ({ ...c, [idx]: e.target.checked }))}
                    className="rounded"
                  />
                  <span className={`flex-1 ${checked[idx] ? "line-through text-silver/70" : ""}`}>{item.item}</span>
                  <span className="text-xs text-silver/70 whitespace-nowrap">Day {item.dueDayFromEffective}</span>
                  <span className="text-xs text-silver/70 w-32 text-right whitespace-nowrap">{item.owner}</span>
                </label>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
