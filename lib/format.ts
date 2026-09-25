export function faNumber(value: number | null | undefined, maximumFractionDigits = 0) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("fa-IR", { maximumFractionDigits }).format(value);
}

export function compactRial(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  const sign = value < 0 ? "−" : "";
  if (abs >= 1e15) return `${sign}${faNumber(abs / 1e15, 1)} هزار تریلیون ریال`;
  if (abs >= 1e12) return `${sign}${faNumber(abs / 1e12, 1)} تریلیون ریال`;
  if (abs >= 1e9) return `${sign}${faNumber(abs / 1e9, 1)} میلیارد ریال`;
  if (abs >= 1e6) return `${sign}${faNumber(abs / 1e6, 1)} میلیون ریال`;
  return `${sign}${faNumber(abs)} ریال`;
}

export function percent(value: number | null | undefined, digits = 2) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${faNumber(value, digits)}٪`;
}

export function faDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Tehran"
  }).format(date);
}
