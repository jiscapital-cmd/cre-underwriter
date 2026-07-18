export function fmtUsd(v: number, decimals = 0): string {
  if (!Number.isFinite(v)) return "—";
  return v.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: decimals });
}

export function fmtPct(v: number | null, decimals = 1): string {
  if (v === null || !Number.isFinite(v)) return "—";
  return `${(v * 100).toFixed(decimals)}%`;
}

export function fmtX(v: number, decimals = 2): string {
  if (!Number.isFinite(v)) return "—";
  return `${v.toFixed(decimals)}x`;
}
