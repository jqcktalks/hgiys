export type IndexRow = {
  crs: string;
  n: string;
  r: string;
  s: number;
  rel: number; canc: number; freq: number; conn: number;
  rank: number;
  pct: number;
  cx: number;
  pd: number;
  cov: number;
};

export type Station = {
  crs: string; name: string; region: string; owner: string;
  score: number | null; rank: number | null; of: number;
  scores: {
    reliability: number | null; cancellations: number | null;
    frequency: number | null; connectivity: number | null;
  };
  stats: {
    punctual: number | null; cancelled: number | null; coverage: number | null;
    perDay: number | null; scheduled: number; recorded: number;
    footfall: number | null; interchanges: number | null;
  };
  operators: string[];
  history: { label: string; punctual: number | null; cancelled: number | null; scheduled: number }[];
};

export type Meta = {
  generated: string; windowFrom: string; windowTo: string; periods: number;
  stationCount: number; noScoreCount: number;
  nationalPunctual: number; nationalCancel: number; totalScheduledStops: number;
  weights: Record<string, number>;
  sources: { name: string; url: string; licence: string }[];
};
