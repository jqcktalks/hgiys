"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { IndexRow } from "@/lib/types";
import { Badge, CrsTag, LEFT, NUM, SECONDARY, TABLE, TD, TH, TableCard } from "../ui";

type SortKey = "rank" | "s" | "rel" | "canc" | "freq" | "conn" | "pct" | "cx" | "pd" | "n";

const COLUMNS: { key: SortKey; label: string; num?: boolean; hint: string; sm?: boolean; rule?: boolean }[] = [
  { key: "rank", label: "#", hint: "National rank" },
  { key: "n", label: "Station", hint: "Station name" },
  { key: "s", label: "Overall", num: true, hint: "Percentile across all four measures combined" },
  { key: "rel", label: "Reliability", num: true, hint: "Percentile: punctuality against other stations", sm: true },
  { key: "canc", label: "Cancellations", num: true, hint: "Percentile: how rarely stops are cancelled", sm: true },
  { key: "freq", label: "Frequency", num: true, hint: "Percentile: scheduled trains per day", sm: true },
  { key: "conn", label: "Connectivity", num: true, hint: "Percentile: operator choice and interchange use", sm: true },
  { key: "pct", label: "On time", num: true, hint: "Measured: % of stops arriving within 3 minutes", sm: true, rule: true },
  { key: "pd", label: "Trains/day", num: true, hint: "Measured: scheduled stops per day", sm: true },
];

const PAGE = 100;

const FIELD =
  "rounded-lg border border-line bg-bg px-[11px] py-[7px] font-sans text-base text-ink outline-none focus:border-accent focus:ring-[3px] focus:ring-accent-bg sm:text-[13.5px]";

export default function LeagueTable({ initial, total }: { initial: IndexRow[]; total: number }) {
  const [rows, setRows] = useState<IndexRow[]>(initial);
  const [full, setFull] = useState(false);
  const [q, setQ] = useState("");
  const [region, setRegion] = useState("");
  const [sort, setSort] = useState<SortKey>("rank");
  const [asc, setAsc] = useState(true);
  const [limit, setLimit] = useState(PAGE);

  useEffect(() => {
    fetch("/data/index.json")
      .then((r) => r.json())
      .then((all: IndexRow[]) => { setRows(all); setFull(true); })
      .catch(() => {});
  }, []);

  const regions = useMemo(
    () => [...new Set(rows.map((r) => r.r).filter(Boolean))].sort(),
    [rows]
  );

  const view = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let out = rows;
    if (needle) out = out.filter((r) => r.n.toLowerCase().includes(needle) || r.crs.toLowerCase() === needle);
    if (region) out = out.filter((r) => r.r === region);

    const dir = asc ? 1 : -1;
    out = [...out].sort((a, b) => {
      if (sort === "n") return a.n.localeCompare(b.n) * dir;
      return ((a[sort] as number) - (b[sort] as number)) * dir;
    });
    return out;
  }, [rows, q, region, sort, asc]);

  const setSortKey = (k: SortKey) => {
    if (k === sort) { setAsc((v) => !v); return; }
    setSort(k);
    setAsc(k === "rank" || k === "n");
    setLimit(PAGE);
  };

  const shown = view.slice(0, limit);

  return (
    <TableCard>
      <div className="flex flex-wrap items-center gap-2.5 border-b border-line bg-bg-2 px-3.5 py-3">
        <input
          type="search"
          value={q}
          placeholder={full ? `Filter ${total.toLocaleString()} stations…` : "Loading full list…"}
          aria-label="Filter stations"
          className={`${FIELD} w-full sm:w-auto sm:min-w-[180px] sm:flex-1`}
          onChange={(e) => { setQ(e.target.value); setLimit(PAGE); }}
        />
        <select
          value={region}
          onChange={(e) => { setRegion(e.target.value); setLimit(PAGE); }}
          aria-label="Filter by region"
          className={`${FIELD} min-w-0 flex-1 sm:flex-none`}
        >
          <option value="">All regions</option>
          {regions.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <span className="ml-auto shrink-0 text-[13px] text-ink-3">
          {view.length.toLocaleString()} shown
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className={TABLE}>
          <thead>
            <tr>
              {COLUMNS.map((c) => (
                <th
                  key={c.key}
                  title={c.hint}
                  scope="col"
                  aria-sort={sort === c.key ? (asc ? "ascending" : "descending") : "none"}
                  className={[
                    TH,
                    "cursor-pointer select-none hover:text-ink",
                    c.num ? NUM : LEFT,
                    c.sm ? SECONDARY : "",
                    c.rule ? "border-l border-line" : "",
                  ].join(" ")}
                  onClick={() => setSortKey(c.key)}
                >
                  {c.label}
                  {sort === c.key && <span className="ml-[3px] opacity-45">{asc ? "↑" : "↓"}</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="[&>tr:last-child>td]:border-b-0">
            {shown.map((r) => (
              <tr key={r.crs} className="hover:bg-bg-2">
                <td className={`${TD} w-[54px] tabular-nums text-ink-3`}>{r.rank}</td>
                <td className={`${TD} font-book`}>
                  <Link href={`/station/${r.crs}`} className="hover:text-accent">
                    {r.n}
                  </Link>
                  <CrsTag crs={r.crs} />
                  <div className="text-[13px] font-normal text-ink-3">{r.r}</div>
                </td>
                <td className={`${TD} ${NUM}`}>
                  <Badge score={r.s} />
                </td>
                <td className={`${TD} ${NUM} ${SECONDARY}`}>{r.rel}</td>
                <td className={`${TD} ${NUM} ${SECONDARY}`}>{r.canc}</td>
                <td className={`${TD} ${NUM} ${SECONDARY}`}>{r.freq}</td>
                <td className={`${TD} ${NUM} ${SECONDARY}`}>{r.conn}</td>
                <td className={`${TD} ${NUM} ${SECONDARY} border-l border-line-2`}>{r.pct}%</td>
                <td className={`${TD} ${NUM} ${SECONDARY}`}>{Math.round(r.pd)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {view.length > limit && (
        <div className="border-t border-line bg-bg-2 px-3.5 py-3 text-center text-[13.5px] text-ink-3">
          <button
            onClick={() => setLimit((l) => l + 250)}
            className="cursor-pointer border-none bg-transparent p-0 text-accent hover:underline"
          >
            Show more ({(view.length - limit).toLocaleString()} remaining)
          </button>
        </div>
      )}
      {view.length === 0 && (
        <div className="border-t border-line bg-bg-2 px-3.5 py-3 text-center text-[13.5px] text-ink-3">
          No stations match that filter.
        </div>
      )}
    </TableCard>
  );
}
