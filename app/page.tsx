import Link from "next/link";
import SearchBox from "./search-box";
import { getIndex, getMeta } from "@/lib/data";
import type { IndexRow } from "@/lib/types";
import {
  Badge,
  BlockHead,
  CrsTag,
  LEFT,
  NUM,
  SECONDARY,
  TABLE,
  TD,
  TH,
  TableCard,
  Wrap,
} from "./ui";

export default function Home() {
  const index = getIndex();
  const meta = getMeta();

  const best = index.slice(0, 8);
  const worst = [...index].slice(-8).reverse();
  const busiest = [...index].sort((a, b) => b.pd - a.pd).slice(0, 8);

  return (
    <>
      <Wrap className="pt-12 pb-10 text-center sm:pt-[68px]">
        <h1 className="mb-3.5 text-[30px] font-bold tracking-[-0.035em] sm:text-[36px] md:text-[42px]">
          How good is your station?
        </h1>
        <p className="mx-auto max-w-[560px] text-[15px] text-ink-2 sm:text-[17px]">
          Every railway station in Britain, ranked against every other on how punctual, frequent
          and well connected it actually is. The figures come from the ORR.
        </p>

        <SearchBox />

        <div className="mt-[30px] flex flex-wrap justify-center gap-x-8 gap-y-4 border-t border-line-2 pt-[26px] sm:gap-x-[34px]">
          <Stat v={meta.stationCount.toLocaleString()} k="stations scored" />
          <Stat v={`${meta.nationalPunctual}%`} k="arrive within 3 min" />
          <Stat v={`${meta.nationalCancel}%`} k="stops cancelled" />
        </div>
      </Wrap>

      <Wrap>
        <section className="py-11">
          <BlockHead
            title="Best scoring"
            sub={
              <Link href="/stations" className="hover:text-ink">
                See all {meta.stationCount.toLocaleString()} →
              </Link>
            }
          />
          <MiniTable rows={best} />
        </section>

        <section className="pb-11">
          <BlockHead title="Busiest" sub={<em>by scheduled stops per day</em>} />
          <MiniTable rows={busiest} />
        </section>

        <section className="pb-11">
          <BlockHead title="Worst scoring" sub={<em>mostly quiet rural stops</em>} />
          <MiniTable rows={worst} />
        </section>

        <section className="pb-11">
          <p className="text-[13.5px] text-ink-3">
            The scores are percentiles, rather than the percentage of trains running on time. So a
            score of 80 means the station rates better than 80% of stations in Britain, across
            punctuality, cancellations, frequency and connections combined. The actual punctuality
            figures are shown on each station page as well.{" "}
            <Link href="/method" className="text-accent hover:underline">
              How this works
            </Link>
          </p>
        </section>
      </Wrap>
    </>
  );
}

function Stat({ v, k }: { v: string; k: string }) {
  return (
    <div className="text-center">
      <div className="text-[22px] font-figure tracking-[-0.02em] tabular-nums">{v}</div>
      <div className="mt-px text-[12.5px] text-ink-3">{k}</div>
    </div>
  );
}

function MiniTable({ rows }: { rows: IndexRow[] }) {
  return (
    <TableCard>
      <div className="overflow-x-auto">
        <table className={TABLE}>
          <thead>
            <tr>
              <th className={`${TH} ${LEFT}`}>#</th>
              <th className={`${TH} ${LEFT}`}>Station</th>
              <th className={`${TH} ${NUM}`}>Score</th>
              <th className={`${TH} ${NUM} ${SECONDARY}`}>On time</th>
              <th className={`${TH} ${NUM} ${SECONDARY}`}>Cancelled</th>
              <th className={`${TH} ${NUM} ${SECONDARY}`}>Trains per day</th>
            </tr>
          </thead>
          <tbody className="[&>tr:last-child>td]:border-b-0">
            {rows.map((r) => (
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
                <td className={`${TD} ${NUM} ${SECONDARY}`}>{r.pct}%</td>
                <td className={`${TD} ${NUM} ${SECONDARY}`}>{r.cx}%</td>
                <td className={`${TD} ${NUM} ${SECONDARY}`}>{Math.round(r.pd)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </TableCard>
  );
}
