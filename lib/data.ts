import fs from "node:fs";
import path from "node:path";
import type { IndexRow, Meta, Station } from "./types";

const DATA = path.join(process.cwd(), "data");

export type { IndexRow, Meta, Station };
export { band, bandLabel, DIMENSION_LABELS } from "./band";

let indexCache: IndexRow[] | null = null;

export function getIndex(): IndexRow[] {
  if (!indexCache) {
    indexCache = JSON.parse(fs.readFileSync(path.join(DATA, "index.json"), "utf8")) as IndexRow[];
  }
  return indexCache;
}

export function getMeta(): Meta {
  return JSON.parse(fs.readFileSync(path.join(DATA, "meta.json"), "utf8")) as Meta;
}

export function getStation(crs: string): Station | null {
  const safe = crs.toUpperCase();
  if (!/^[A-Z]{3}$/.test(safe)) return null;
  const file = path.join(DATA, "stations", `${safe}.json`);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf8")) as Station;
}

export function getAllCrs(): string[] {
  return fs
    .readdirSync(path.join(DATA, "stations"))
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/, ""));
}
