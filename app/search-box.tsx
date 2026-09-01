"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Badge } from "./ui";

type Entry = [crs: string, name: string, region: string, score: number];

export default function SearchBox({ placeholder = "Search a station, e.g. Kidderminster, Leeds, CLJ" }) {
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

  const load = () => {
    if (entries) return;
    fetch("/data/search.json")
      .then((r) => r.json())
      .then(setEntries)
      .catch(() => setEntries([]));
  };

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const needle = q.trim().toLowerCase();
  const hits: Entry[] = !needle || !entries
    ? []
    : entries
        .map((e) => {
          const name = e[1].toLowerCase();
          if (e[0].toLowerCase() === needle) return { e, w: 0 };
          if (name === needle) return { e, w: 1 };
          if (name.startsWith(needle)) return { e, w: 2 };
          if (name.includes(needle)) return { e, w: 3 };
          return null;
        })
        .filter((x): x is { e: Entry; w: number } => x !== null)
        .sort((a, b) => a.w - b.w || b.e[3] - a.e[3])
        .slice(0, 8)
        .map((x) => x.e);

  const go = (crs: string) => { window.location.href = `/station/${crs}`; };

  return (
    <div className="relative mx-auto mt-[26px] max-w-[520px]" ref={boxRef}>
      <input
        type="search"
        value={q}
        placeholder={placeholder}
        aria-label="Search stations"
        autoComplete="off"
        className="w-full rounded-card border border-line bg-bg px-4 py-3 font-sans text-base text-ink outline-none transition-[border-color,box-shadow] duration-100 placeholder:text-ink-3 focus:border-accent focus:ring-[3px] focus:ring-accent-bg sm:text-[15px]"
        onFocus={() => { load(); setOpen(true); }}
        onChange={(e) => { load(); setQ(e.target.value); setActive(0); setOpen(true); }}
        onKeyDown={(e) => {
          if (!hits.length) return;
          if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => (i + 1) % hits.length); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => (i - 1 + hits.length) % hits.length); }
          else if (e.key === "Enter") { e.preventDefault(); go(hits[active][0]); }
          else if (e.key === "Escape") setOpen(false);
        }}
      />
      {open && needle.length > 0 && (
        <div className="absolute top-[calc(100%+6px)] right-0 left-0 z-40 overflow-hidden rounded-card border border-line bg-white text-left shadow-[0_4px_24px_rgba(16,24,40,0.09)]">
          {hits.length === 0 ? (
            <div className="p-3.5 text-sm text-ink-3">
              {entries === null ? "Loading stations…" : `No station matching “${q}”`}
            </div>
          ) : (
            hits.map((e, i) => (
              <Link
                key={e[0]}
                href={`/station/${e[0]}`}
                onMouseEnter={() => setActive(i)}
                className={`flex items-center justify-between gap-3 border-b border-line-2 px-3.5 py-2.5 last:border-b-0 hover:bg-bg-2 ${
                  i === active ? "bg-bg-2" : ""
                }`}
              >
                <span className="min-w-0">
                  <span className="font-book">{e[1]}</span>
                  <span className="text-[12.5px] text-ink-3"> · {e[2]}</span>
                </span>
                <Badge score={e[3]} />
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
