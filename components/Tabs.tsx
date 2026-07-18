"use client";

export const TABS = [
  "Dashboard",
  "AI Assistant",
  "My Deals",
  "Inputs",
  "Sources & Uses",
  "Proforma",
  "Waterfall",
  "Debt & Financing",
  "Sensitivity & Scenarios",
  "Market & Comps",
  "Scorecard & Risk",
  "DD Checklist",
  "Assumptions Register",
  "LOI Output",
] as const;

export type TabName = (typeof TABS)[number];

export default function Tabs({ active, onChange }: { active: TabName; onChange: (t: TabName) => void }) {
  return (
    <nav className="flex flex-col gap-0.5 w-full">
      {TABS.map((tab) => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={`text-left px-3 py-2 rounded-md text-sm font-medium transition border-l-2 ${
            active === tab
              ? "bg-ink/5 border-ink text-ink"
              : "border-transparent text-silver hover:text-ink hover:bg-panel/60"
          }`}
        >
          {tab}
        </button>
      ))}
    </nav>
  );
}
