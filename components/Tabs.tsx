"use client";

export const TABS = [
  "Dashboard",
  "My Deals",
  "AI Assistant",
  "Inputs",
  "Sources & Uses",
  "Proforma",
  "Debt & Financing",
  "Waterfall",
  "Sensitivity & Scenarios",
  "Market & Comps",
  "Scorecard & Risk",
  "Assumptions Register",
  "DD Checklist",
  "LOI Output",
] as const;

export type TabName = (typeof TABS)[number];

const LABELS: Record<TabName, string> = {
  Dashboard: "Dashboard",
  "My Deals": "My Deals",
  "AI Assistant": "AI Assistant",
  Inputs: "Property Inputs",
  "Sources & Uses": "Sources & Uses",
  Proforma: "Operating Proforma",
  "Debt & Financing": "Debt & Financing",
  Waterfall: "Return Waterfall",
  "Sensitivity & Scenarios": "Sensitivity & Scenarios",
  "Market & Comps": "Market & Comps",
  "Scorecard & Risk": "Scorecard & Risk",
  "Assumptions Register": "Assumptions Register",
  "DD Checklist": "Due Diligence Checklist",
  "LOI Output": "LOI Generator",
};

type Group = { header: string | null; tabs: TabName[] };

const GROUPS: Group[] = [
  { header: null, tabs: ["Dashboard", "My Deals", "AI Assistant"] },
  { header: "Core Model", tabs: ["Inputs", "Sources & Uses", "Proforma", "Debt & Financing", "Waterfall"] },
  { header: "Analysis & Risk", tabs: ["Sensitivity & Scenarios", "Market & Comps", "Scorecard & Risk", "Assumptions Register"] },
  { header: "Execution", tabs: ["DD Checklist", "LOI Output"] },
];

export default function Tabs({ active, onChange }: { active: TabName; onChange: (t: TabName) => void }) {
  return (
    <nav className="flex flex-col gap-4 w-full">
      {GROUPS.map((group, i) => (
        <div key={i} className="flex flex-col gap-0.5">
          {group.header && (
            <div className="px-3 pt-1 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-ink">
              {group.header}
            </div>
          )}
          {group.tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => onChange(tab)}
              className={`text-left px-3 py-2 rounded-md text-sm font-medium transition border-l-2 ${
                active === tab
                  ? "bg-ink/5 border-ink text-ink"
                  : "border-transparent text-silver hover:text-ink hover:bg-panel/60"
              }`}
            >
              {LABELS[tab]}
            </button>
          ))}
        </div>
      ))}
    </nav>
  );
}
