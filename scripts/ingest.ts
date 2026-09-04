import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { streamOds } from "./ods-stream.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CACHE = path.join(ROOT, ".cache");
const OUT = path.join(ROOT, "data");
const PUB = path.join(ROOT, "public", "data");
const STAMP = path.join(OUT, ".stamp.json");

const ODS_URL =
  "https://dataportal.orr.gov.uk/media/krdbknzc/table-3130-time-to-3-and-cancellations-by-station-and-operator.ods";
const CSV_URL =
  "https://dataportal.orr.gov.uk/media/1909/table-1410-passenger-entries-and-exits-and-interchanges-by-station.csv";

const WINDOW_PERIODS = 13;
const DAYS_PER_PERIOD = 28;

const SHRINKAGE_K = 3000;

const WEIGHTS = { reliability: 0.35, cancellations: 0.25, frequency: 0.2, connectivity: 0.2 };

const TOC_NAMES: Record<string, string> = {
  "TfW Rail": "Transport for Wales",
};

function tocName(raw: string): string {
  const s = raw.trim();
  return TOC_NAMES[s] ?? s;
}

function num(raw: string): number | null {
  if (!raw) return null;
  const s = raw.trim();
  if (!s || s.startsWith("[")) return null;
  const v = Number(s.replace(/,/g, ""));
  return Number.isFinite(v) ? v : null;
}

function normName(s: string): string {
  return s
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[.'`’]/g, "")
    .replace(/[-/]/g, " ")
    .replace(/[()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parsePeriod(raw: string): { key: number; label: string } | null {
  const m = raw.match(/(\w{3})\s+(\d{4}).*?Period\s+(\d+)/i);
  if (!m) return null;
  const year = Number(m[2]);
  const period = Number(m[3]);
  return { key: year * 100 + period, label: `${year}/${String((year + 1) % 100).padStart(2, "0")} P${String(period).padStart(2, "0")}` };
}

type Probe = { etag: string | null; lastModified: string | null; size: number | null };

type Stamp = { sources: Record<string, Probe>; config: string };

const SOURCES = [
  { name: "ORR Table 3130", url: ODS_URL, file: "t3130.ods" },
  { name: "ORR Table 1410", url: CSV_URL, file: "t1410.csv" },
];

async function probe(url: string): Promise<Probe | null> {
  try {
    const res = await fetch(url, { method: "HEAD", redirect: "follow" });
    if (!res.ok) return null;
    const len = Number(res.headers.get("content-length"));
    return {
      etag: res.headers.get("etag"),
      lastModified: res.headers.get("last-modified"),
      size: Number.isFinite(len) && len > 0 ? len : null,
    };
  } catch {
    return null;
  }
}

function configHash(): string {
  const tunables = { WINDOW_PERIODS, DAYS_PER_PERIOD, SHRINKAGE_K, WEIGHTS, TOC_NAMES, ODS_URL, CSV_URL };
  return crypto.createHash("sha256").update(JSON.stringify(tunables)).digest("hex").slice(0, 16);
}

function readStamp(): Stamp | null {
  try {
    const s = JSON.parse(fs.readFileSync(STAMP, "utf8")) as Stamp;
    return s && typeof s.config === "string" && s.sources ? s : null;
  } catch {
    return null;
  }
}

function artifactsValid(): boolean {
  try {
    const index = JSON.parse(fs.readFileSync(path.join(OUT, "index.json"), "utf8"));
    if (!Array.isArray(index) || index.length === 0) return false;
    JSON.parse(fs.readFileSync(path.join(OUT, "meta.json"), "utf8"));
    if (fs.readdirSync(path.join(OUT, "stations")).filter((f) => f.endsWith(".json")).length === 0) return false;
    return fs.existsSync(path.join(PUB, "index.json")) && fs.existsSync(path.join(PUB, "search.json"));
  } catch {
    return false;
  }
}

function shortDate(lastModified: string | null): string {
  if (!lastModified) return "unknown date";
  const d = new Date(lastModified);
  return Number.isNaN(d.getTime())
    ? lastModified
    : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function changed(before: Probe | undefined, now: Probe): boolean {
  if (!before) return true;
  if (before.etag && now.etag) return before.etag !== now.etag;
  if (before.lastModified && now.lastModified) return before.lastModified !== now.lastModified;
  return before.size !== now.size;
}

type Decision = { ingest: boolean; reason: string; probes: Map<string, Probe | null> };

async function decide(): Promise<Decision> {
  const probes = new Map<string, Probe | null>();
  const stamp = readStamp();
  const haveArtifacts = artifactsValid();

  if (!haveArtifacts) {
    for (const s of SOURCES) probes.set(s.url, await probe(s.url));
    return { ingest: true, reason: stamp ? "existing data is incomplete" : "no existing data", probes };
  }
  if (!stamp) return { ingest: true, reason: "previous run did not complete", probes };
  if (stamp.config !== configHash()) return { ingest: true, reason: "scoring config changed", probes };

  const reasons: string[] = [];
  let unreachable = false;

  for (const s of SOURCES) {
    const now = await probe(s.url);
    probes.set(s.url, now);
    if (!now) {
      unreachable = true;
      console.log(`  ${s.name.padEnd(16)} ! could not reach server`);
      continue;
    }
    const before = stamp.sources[s.url];
    if (changed(before, now)) {
      reasons.push(`${s.name} updated (${shortDate(before?.lastModified ?? null)} → ${shortDate(now.lastModified)})`);
      console.log(`  ${s.name.padEnd(16)} updated ${shortDate(now.lastModified)}`);
    } else {
      console.log(`  ${s.name.padEnd(16)} unchanged (${shortDate(now.lastModified)})`);
    }
  }

  if (reasons.length) return { ingest: true, reason: reasons.join("; "), probes };
  if (unreachable) {
    const generated = JSON.parse(fs.readFileSync(path.join(OUT, "meta.json"), "utf8")).generated;
    console.log(`\n  warning: could not check for updates; using existing data from ${shortDate(generated)}`);
    return { ingest: false, reason: "sources unreachable", probes };
  }
  return { ingest: false, reason: "data is current", probes };
}

async function download(url: string, dest: string, head: Probe | null, force = false) {
  const marker = `${dest}.head.json`;
  if (!force && fs.existsSync(dest) && fs.statSync(dest).size > 0) {
    const size = fs.statSync(dest).size;
    let fetchedAt: Probe | null = null;
    try {
      fetchedAt = JSON.parse(fs.readFileSync(marker, "utf8")) as Probe;
    } catch {
      fetchedAt = null;
    }
    if (!head || (fetchedAt && !changed(fetchedAt, head))) {
      console.log(`  cached  ${path.basename(dest)} (${(size / 1e6).toFixed(1)} MB)`);
      return;
    }
    console.log(`  stale   ${path.basename(dest)} (${fetchedAt ? "upstream changed" : "no provenance recorded"})`);
  }
  process.stdout.write(`  fetch   ${path.basename(dest)} ... `);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(dest, buf);
  if (head) fs.writeFileSync(marker, JSON.stringify(head));
  else fs.rmSync(marker, { force: true });
  console.log(`${(buf.length / 1e6).toFixed(1)} MB`);
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c !== "\r") field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

type PeriodStat = {
  key: number;
  label: string;
  scheduled: number;
  recorded: number;
  punctual: number | null;
  cancelled: number | null;
};

type StationAcc = {
  name: string;
  periods: Map<number, PeriodStat>;
  opPeriod: number;
  operators: Set<string>;
};

const stations = new Map<string, StationAcc>();
const periodLabels = new Map<number, string>();

function getStation(name: string): StationAcc {
  const key = normName(name);
  let s = stations.get(key);
  if (!s) {
    s = { name, periods: new Map(), opPeriod: -1, operators: new Set() };
    stations.set(key, s);
  }
  return s;
}

async function main() {
  const started = Date.now();
  const force = process.argv.includes("--force");
  const checkOnly = process.argv.includes("--check");

  console.log("\nRailScore ingest\n");

  if (checkOnly) {
    console.log("0/5  checking sources");
    const decision = await decide();
    console.log(decision.ingest ? `\nstale: ${decision.reason}` : `\ncurrent: ${decision.reason}`);
    process.exitCode = decision.ingest ? 1 : 0;
    return;
  }

  let probes = new Map<string, Probe | null>();
  if (force) {
    console.log("--force: re-downloading and re-ingesting unconditionally");
  } else {
    console.log("0/5  checking sources");
    const decision = await decide();
    probes = decision.probes;
    if (!decision.ingest) {
      console.log(`\n${decision.reason} — skipping ingest`);
      console.log(`checked in ${((Date.now() - started) / 1000).toFixed(1)}s\n`);
      return;
    }
    console.log(`\n${decision.reason} — ingesting`);
  }

  fs.mkdirSync(CACHE, { recursive: true });
  fs.mkdirSync(path.join(OUT, "stations"), { recursive: true });
  fs.rmSync(STAMP, { force: true });

  console.log("\n1/5  source files");
  const odsPath = path.join(CACHE, "t3130.ods");
  const csvPath = path.join(CACHE, "t1410.csv");
  const odsHead = probes.get(ODS_URL) ?? (await probe(ODS_URL));
  const csvHead = probes.get(CSV_URL) ?? (await probe(CSV_URL));
  await download(ODS_URL, odsPath, odsHead, force);
  await download(CSV_URL, csvPath, csvHead, force);

  console.log("\n2/5  streaming Table 3130 (279 MB content.xml)");
  let rowsA = 0;
  let rowsB = 0;

  await streamOds(odsPath, (sheet, row, rowIndex) => {
    if (rowIndex < 5) return;

    if (sheet === "3130a_Stations") {
      const p = parsePeriod(row[0] ?? "");
      const name = (row[1] ?? "").trim();
      if (!p || !name) return;
      periodLabels.set(p.key, p.label);

      const st = getStation(name);
      st.periods.set(p.key, {
        key: p.key,
        label: p.label,
        scheduled: num(row[2] ?? "") ?? 0,
        recorded: num(row[3] ?? "") ?? 0,
        punctual: num(row[5] ?? ""),
        cancelled: num(row[6] ?? ""),
      });
      rowsA++;
      return;
    }

    if (sheet === "3130b_Stations_and_operators") {
      const p = parsePeriod(row[0] ?? "");
      const name = (row[1] ?? "").trim();
      const operator = tocName(row[2] ?? "");
      if (!p || !name || !operator) return;

      const st = getStation(name);
      if (p.key > st.opPeriod) {
        st.opPeriod = p.key;
        st.operators = new Set();
      }
      if (p.key === st.opPeriod) st.operators.add(operator);
      rowsB++;
    }
  });

  console.log(`     3130a rows: ${rowsA.toLocaleString()}`);
  console.log(`     3130b rows: ${rowsB.toLocaleString()}`);
  console.log(`     stations:   ${stations.size.toLocaleString()}`);

  const allPeriods = [...periodLabels.keys()].sort((a, b) => a - b);
  const window = allPeriods.slice(-WINDOW_PERIODS);
  const windowSet = new Set(window);
  console.log(`     periods:    ${allPeriods.length} (scoring on last ${window.length}: ${periodLabels.get(window[0])} → ${periodLabels.get(window[window.length - 1])})`);

  console.log("\n3/5  joining Table 1410 for CRS codes");
  const csv = parseCsv(fs.readFileSync(csvPath, "utf8"));
  const meta = new Map<string, { crs: string; name: string; footfall: number | null; interchanges: number | null; region: string; owner: string }>();

  for (let i = 4; i < csv.length; i++) {
    const r = csv[i];
    if (!r || r.length < 15) continue;
    const name = (r[0] ?? "").trim();
    const crs = (r[14] ?? "").trim().toUpperCase();
    if (!name || !/^[A-Z]{3}$/.test(crs)) continue;
    meta.set(normName(name), {
      crs,
      name,
      footfall: num(r[4] ?? ""),
      interchanges: num(r[6] ?? ""),
      region: (r[15] ?? "").trim(),
      owner: tocName(r[16] ?? ""),
    });
  }
  console.log(`     1410 stations with CRS: ${meta.size.toLocaleString()}`);

  console.log("\n4/5  scoring");

  type Row = {
    crs: string; name: string; region: string; owner: string;
    scheduled: number; recorded: number; coverage: number;
    punctualRaw: number | null; punctualAdj: number | null; cancelRaw: number | null;
    perDay: number; operators: string[]; footfall: number | null; interchanges: number | null;
    history: { label: string; punctual: number | null; cancelled: number | null; scheduled: number }[];
  };

  const rows: Row[] = [];
  let unmatched = 0;
  const unmatchedNames: string[] = [];

  for (const [key, st] of stations) {
    const m = meta.get(key);
    if (!m) {
      unmatched++;
      if (unmatchedNames.length < 25) unmatchedNames.push(st.name);
      continue;
    }

    let scheduled = 0, recorded = 0;
    let punctualNum = 0, punctualDen = 0;
    let cancelNum = 0, cancelDen = 0;
    const history: Row["history"] = [];

    for (const pk of window) {
      const p = st.periods.get(pk);
      if (!p) continue;
      scheduled += p.scheduled;
      recorded += p.recorded;
      if (p.punctual !== null && p.recorded > 0) {
        punctualNum += p.punctual * p.recorded;
        punctualDen += p.recorded;
      }
      if (p.cancelled !== null && p.scheduled > 0) {
        cancelNum += p.cancelled * p.scheduled;
        cancelDen += p.scheduled;
      }
      history.push({ label: p.label, punctual: p.punctual, cancelled: p.cancelled, scheduled: p.scheduled });
    }

    if (scheduled <= 0) continue;

    rows.push({
      crs: m.crs, name: m.name, region: m.region, owner: m.owner,
      scheduled, recorded,
      coverage: scheduled > 0 ? (recorded / scheduled) * 100 : 0,
      punctualRaw: punctualDen > 0 ? punctualNum / punctualDen : null,
      punctualAdj: null,
      cancelRaw: cancelDen > 0 ? cancelNum / cancelDen : null,
      perDay: scheduled / (window.length * DAYS_PER_PERIOD),
      operators: [...st.operators].sort(),
      footfall: m.footfall, interchanges: m.interchanges,
      history,
    });
  }

  console.log(`     matched:   ${rows.length.toLocaleString()} stations`);
  console.log(`     unmatched: ${unmatched} (no CRS in 1410, excluded)`);
  if (unmatchedNames.length) console.log(`       e.g. ${unmatchedNames.slice(0, 8).join(", ")}`);

  const withP = rows.filter((r) => r.punctualRaw !== null);
  const nationalPunctual =
    withP.reduce((a, r) => a + r.punctualRaw! * r.recorded, 0) / withP.reduce((a, r) => a + r.recorded, 0);
  const nationalCancel =
    rows.filter((r) => r.cancelRaw !== null).reduce((a, r) => a + r.cancelRaw! * r.scheduled, 0) /
    rows.filter((r) => r.cancelRaw !== null).reduce((a, r) => a + r.scheduled, 0);

  for (const r of rows) {
    if (r.punctualRaw === null) continue;
    r.punctualAdj = (r.punctualRaw * r.recorded + nationalPunctual * SHRINKAGE_K) / (r.recorded + SHRINKAGE_K);
  }

  console.log(`     national punctuality: ${nationalPunctual.toFixed(1)}% within 3 min`);
  console.log(`     national cancellations: ${nationalCancel.toFixed(1)}%`);

  function percentileScores(values: (number | null)[], higherIsBetter: boolean): (number | null)[] {
    const idx = values.map((v, i) => ({ v, i })).filter((x) => x.v !== null) as { v: number; i: number }[];
    idx.sort((a, b) => (higherIsBetter ? a.v - b.v : b.v - a.v));
    const out: (number | null)[] = values.map(() => null);
    const n = idx.length;
    let i = 0;
    while (i < n) {
      let j = i;
      while (j + 1 < n && idx[j + 1].v === idx[i].v) j++;
      const pct = n > 1 ? ((i + j) / 2 / (n - 1)) * 100 : 100;
      for (let k = i; k <= j; k++) out[idx[k].i] = pct;
      i = j + 1;
    }
    return out;
  }

  const relScores = percentileScores(rows.map((r) => r.punctualAdj), true);
  const cancScores = percentileScores(rows.map((r) => r.cancelRaw), false);
  const freqScores = percentileScores(rows.map((r) => r.perDay), true);
  const connRaw = rows.map((r) => {
    const ops = r.operators.length;
    const inter = r.interchanges ?? 0;
    return ops * 10 + Math.log10(inter + 1) * 12;
  });
  const connScores = percentileScores(connRaw, true);

  const blend = rows.map((r, i) => {
    const rel = relScores[i];
    const canc = cancScores[i];
    if (rel === null || canc === null) return null;
    const freq = freqScores[i] ?? 0;
    const conn = connScores[i] ?? 0;
    return rel * WEIGHTS.reliability + canc * WEIGHTS.cancellations + freq * WEIGHTS.frequency + conn * WEIGHTS.connectivity;
  });

  const compositeScores = percentileScores(blend, true);

  type Scored = Row & { rel: number | null; canc: number | null; freq: number; conn: number; score: number | null; rank: number };
  const scored: Scored[] = rows.map((r, i) => ({
    ...r,
    rel: relScores[i],
    canc: cancScores[i],
    freq: freqScores[i] ?? 0,
    conn: connScores[i] ?? 0,
    score: compositeScores[i],
    rank: 0,
  }));

  const ranked = scored.filter((s) => s.score !== null).sort((a, b) => b.score! - a.score!);
  ranked.forEach((s, i) => (s.rank = i + 1));
  const noData = scored.filter((s) => s.score === null);
  console.log(`     ranked:    ${ranked.length.toLocaleString()} stations`);
  console.log(`     no score:  ${noData.length} (insufficient punctuality data)`);

  console.log("\n5/5  writing artifacts");
  const r1 = (n: number | null) => (n === null ? null : Math.round(n * 10) / 10);

  const index = ranked.map((s) => ({
    crs: s.crs, n: s.name, r: s.region,
    s: Math.round(s.score!),
    rel: Math.round(s.rel!), canc: Math.round(s.canc!), freq: Math.round(s.freq), conn: Math.round(s.conn),
    rank: s.rank,
    pct: r1(s.punctualRaw), cx: r1(s.cancelRaw), pd: r1(s.perDay), cov: r1(s.coverage),
  }));
  fs.writeFileSync(path.join(OUT, "index.json"), JSON.stringify(index));

  fs.mkdirSync(PUB, { recursive: true });
  fs.writeFileSync(path.join(PUB, "index.json"), JSON.stringify(index));
  fs.writeFileSync(
    path.join(PUB, "search.json"),
    JSON.stringify(ranked.map((s) => [s.crs, s.name, s.region, Math.round(s.score!)]))
  );

  const stationsDir = path.join(OUT, "stations");
  for (const f of fs.readdirSync(stationsDir)) fs.unlinkSync(path.join(stationsDir, f));

  for (const s of scored) {
    fs.writeFileSync(
      path.join(stationsDir, `${s.crs}.json`),
      JSON.stringify({
        crs: s.crs, name: s.name, region: s.region, owner: s.owner,
        score: s.score === null ? null : Math.round(s.score),
        rank: s.rank || null, of: ranked.length,
        scores: { reliability: r1(s.rel), cancellations: r1(s.canc), frequency: r1(s.freq), connectivity: r1(s.conn) },
        stats: {
          punctual: r1(s.punctualRaw), cancelled: r1(s.cancelRaw), coverage: r1(s.coverage),
          perDay: r1(s.perDay), scheduled: s.scheduled, recorded: s.recorded,
          footfall: s.footfall, interchanges: s.interchanges,
        },
        operators: s.operators,
        history: s.history,
      })
    );
  }

  const totalStops = ranked.reduce((a, s) => a + s.scheduled, 0);
  fs.writeFileSync(
    path.join(OUT, "meta.json"),
    JSON.stringify({
      generated: new Date().toISOString(),
      windowFrom: periodLabels.get(window[0]),
      windowTo: periodLabels.get(window[window.length - 1]),
      periods: window.length,
      stationCount: ranked.length,
      noScoreCount: noData.length,
      nationalPunctual: r1(nationalPunctual),
      nationalCancel: r1(nationalCancel),
      totalScheduledStops: totalStops,
      weights: WEIGHTS,
      sources: [
        { name: "ORR Table 3130", url: ODS_URL, licence: "Open Government Licence" },
        { name: "ORR Table 1410", url: CSV_URL, licence: "Open Government Licence" },
      ],
    }, null, 2)
  );

  const stampSources: Record<string, Probe> = {};
  for (const [url, head] of [[ODS_URL, odsHead], [CSV_URL, csvHead]] as const) {
    if (head) stampSources[url] = head;
  }
  fs.writeFileSync(STAMP, JSON.stringify({ sources: stampSources, config: configHash() }, null, 2));

  const idxSize = fs.statSync(path.join(OUT, "index.json")).size;
  const stSize = fs.readdirSync(stationsDir).reduce((a, f) => a + fs.statSync(path.join(stationsDir, f)).size, 0);
  console.log(`     index.json     ${(idxSize / 1024).toFixed(0)} KB`);
  console.log(`     stations/*     ${(stSize / 1e6).toFixed(1)} MB across ${scored.length} files`);
  console.log(`\ndone in ${((Date.now() - started) / 1000).toFixed(1)}s`);
  console.log(`peak RSS ${(process.memoryUsage.rss() / 1e6).toFixed(0)} MB\n`);

  console.log("top 5:");
  for (const s of ranked.slice(0, 5)) console.log(`  ${String(s.rank).padStart(4)}. ${s.name.padEnd(28)} ${Math.round(s.score!)}`);
  console.log("bottom 5:");
  for (const s of ranked.slice(-5)) console.log(`  ${String(s.rank).padStart(4)}. ${s.name.padEnd(28)} ${Math.round(s.score!)}`);
}

main().catch((e) => {
  console.error("\ningest failed:", e);
  process.exit(1);
});
