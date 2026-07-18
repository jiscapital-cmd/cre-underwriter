"use client";

type Props = {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  percent?: boolean;
  prefix?: string;
};

export default function NumberField({ label, value, onChange, step, percent, prefix }: Props) {
  const displayValue = percent ? +(value * 100).toFixed(4) : value;
  return (
    <label className="block">
      <span className="label">{label}</span>
      <div className="flex items-center gap-1 mt-1">
        {prefix && <span className="text-silver/70 text-sm">{prefix}</span>}
        <input
          type="number"
          className="input"
          step={step ?? (percent ? 0.1 : 1)}
          value={Number.isFinite(displayValue) ? displayValue : 0}
          onChange={(e) => {
            const raw = parseFloat(e.target.value);
            const v = Number.isFinite(raw) ? raw : 0;
            onChange(percent ? v / 100 : v);
          }}
        />
        {percent && <span className="text-silver/70 text-sm">%</span>}
      </div>
    </label>
  );
}
