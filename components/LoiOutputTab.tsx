"use client";

import { useState } from "react";
import { DealInputs } from "@/lib/underwriting";
import NumberField from "./NumberField";

type Props = {
  narrative: string;
  inputs: DealInputs;
  onChange: (patch: Partial<DealInputs>) => void;
};

function TextField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label>
      <span className="label">{label}</span>
      <input className="input mt-1" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </label>
  );
}

export default function LoiOutputTab({ narrative, inputs, onChange }: Props) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(narrative);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="font-semibold mb-4">LOI Document Details</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <TextField label="Buyer Entity Name" value={inputs.buyerEntityName} onChange={(v) => onChange({ buyerEntityName: v })} placeholder="[Buyer Entity Name]" />
          <TextField label="Seller / Broker Name" value={inputs.sellerOrBrokerName} onChange={(v) => onChange({ sellerOrBrokerName: v })} placeholder="[Seller/Broker Name]" />
          <TextField label="Title Company" value={inputs.titleCompanyName} onChange={(v) => onChange({ titleCompanyName: v })} placeholder="a mutually agreed title company" />
          <TextField label="Property Address" value={inputs.propertyAddress} onChange={(v) => onChange({ propertyAddress: v })} placeholder="[Full Address]" />
          <TextField label="City" value={inputs.propertyCity} onChange={(v) => onChange({ propertyCity: v })} placeholder="[City]" />
          <TextField label="State" value={inputs.propertyState} onChange={(v) => onChange({ propertyState: v })} placeholder="[State]" />
          <TextField label="Governing Law State" value={inputs.governingLawState} onChange={(v) => onChange({ governingLawState: v })} />
          <NumberField label="Exclusivity Period (days)" value={inputs.exclusivityDays} onChange={(v) => onChange({ exclusivityDays: v })} />
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold">LOI Output & Narrative</h2>
            <p className="text-sm text-silver">
              Auto-generated from current inputs and returns. Edit freely before sending — this is a starting draft,
              not a substitute for counsel review of your PSA.
            </p>
          </div>
          <button
            onClick={copy}
            className="bg-ink text-navy font-semibold text-sm font-medium px-4 py-2 rounded-md hover:opacity-90 whitespace-nowrap"
          >
            {copied ? "Copied ✓" : "Copy to Clipboard"}
          </button>
        </div>
        <textarea
          readOnly
          value={narrative}
          className="w-full h-[600px] font-mono text-sm border border-cardBorder rounded-md p-4 bg-panel/40 whitespace-pre-wrap"
        />
      </div>
    </div>
  );
}
