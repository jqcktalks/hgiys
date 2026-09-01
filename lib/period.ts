export function periodMidpoint(label: string): Date | null {
  const m = /^(\d{4})\/\d{2}\s+P(\d{1,2})$/.exec(label.trim());
  if (!m) return null;
  const startYear = Number(m[1]);
  const period = Number(m[2]);
  if (!Number.isFinite(startYear) || period < 1 || period > 13) return null;
  const d = new Date(Date.UTC(startYear, 3, 1));
  d.setUTCDate(d.getUTCDate() + (period - 1) * 28 + 14);
  return d;
}

export function periodShort(label: string): string {
  const d = periodMidpoint(label);
  return d ? d.toLocaleDateString("en-GB", { month: "short", year: "2-digit", timeZone: "UTC" }) : label;
}

export function periodLong(label: string): string {
  const d = periodMidpoint(label);
  return d ? d.toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" }) : label;
}
