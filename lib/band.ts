export type Band = "good" | "ok" | "poor" | "none";

export function band(score: number | null): Band {
  if (score === null || Number.isNaN(score)) return "none";
  if (score >= 70) return "good";
  if (score >= 45) return "ok";
  return "poor";
}

export function bandLabel(score: number | null): string {
  const b = band(score);
  return b === "good" ? "Strong" : b === "ok" ? "Average" : b === "poor" ? "Weak" : "No data";
}

export const DIMENSION_LABELS: Record<string, string> = {
  reliability: "Reliability",
  cancellations: "Cancellations",
  frequency: "Frequency",
  connectivity: "Connectivity",
};
