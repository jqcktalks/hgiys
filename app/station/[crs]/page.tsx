import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import HistoryChart from "./history-chart";
import { getAllCrs, getStation, getMeta } from "@/lib/data";
import { periodLong } from "@/lib/period";
import { Badge, BlockHead, CrsTag, MeterFill, TD, TableCard, Wrap } from "../../ui";

export function generateStaticParams() {
  return getAllCrs().map((crs) => ({ crs }));
}

export async function generateMetadata({ params }: { params: Promise<{ crs: string }> }): Promise<Metadata> {
  const { crs } = await params;
  const s = getStation(crs);
  if (!s) return { title: "Station not found" };
  return {
    title:
      s.score === null
        ? `${s.name} (${s.crs}): not enough data to score`
        : `${s.name} (${s.crs}): ranked ${s.rank?.toLocaleString() ?? "n/a"} of ${s.of.toLocaleString()}`,
    description:
      s.score === null
        ? `Performance data for ${s.name}.`
        : `${s.name} rates better than ${s.score}% of British stations, ranking ${s.rank} of ${s.of}. ${s.stats.punctual}% of trains arrive within 3 minutes.`,
  };
}

const DIMENSIONS = [
  { key: "reliability", label: "Reliability", hint: "Punctuality against other stations" },
  { key: "cancellations", label: "Cancellations", hint: "How rarely stops are cancelled" },
  { key: "frequency", label: "Frequency", hint: "Scheduled trains per day" },
  { key: "connectivity", label: "Connectivity", hint: "Operator choice and interchange use" },
] as const;

export default async function StationPage({ params }: { params: Promise<{ crs: string }> }) {
  const { crs } = await params;
  const s = getStation(crs);
  if (!s) notFound();
  const meta = getMeta();

  const lowCoverage = (s.stats.coverage ?? 100) < 60;

  return (
    <>
      <Wrap className="pt-8 sm:pt-9">
        <div className="mb-3 text-[13px] text-ink-3">
          <Link href="/stations" className="hover:text-accent">
            Stations
          </Link>{" "}
          · {s.region || "Great Britain"}
        </div>

        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
          <div className="min-w-0">
            <h1 className="text-[26px] font-bold tracking-[-0.03em] sm:text-[32px]">
              {s.name}
              <CrsTag crs={s.crs} className="align-[7px] !text-xs !px-[7px] !py-[3px] !ml-[11px]" />
            </h1>
            <div className="mt-[5px] text-[14.5px] text-ink-2">
              {s.operators.length > 0
                ? `${s.operators.length} operator${s.operators.length > 1 ? "s" : ""} · ${s.operators.join(", ")}`
                : s.owner || "Great Britain"}
            </div>
          </div>

          <div className="w-full text-left sm:w-auto sm:text-right">
            <Badge score={s.score} size="lg" />
            {s.score === null && (
              <div className="mt-1.5 text-[13px] text-ink-3">Not enough data to score</div>
            )}
          </div>
        </div>

        {s.score !== null && (
          <div className="grid gap-0.5 pt-6 sm:pt-7">
            {DIMENSIONS.map((d) => {
              const v = s.scores[d.key];
              return (
                <MeterRow
                  key={d.key}
                  label={d.label}
                  hint={d.hint}
                  score={v}
                  value={
                    v === null ? (
                      "no data"
                    ) : (
                      <>
                        beats <b className="font-demi tabular-nums text-ink">{Math.round(v)}%</b>
                      </>
                    )
                  }
                />
              );
            })}

            <MeterRow
              label="Overall"
              hint="Position across all four measures combined"
              score={s.score}
              summary
              value={
                <>
                  <b className="font-demi tabular-nums text-ink">
                    {s.rank?.toLocaleString() ?? "n/a"}
                  </b>{" "}
                  of {s.of.toLocaleString()}
                </>
              }
            />
          </div>
        )}
      </Wrap>

      <Wrap>
        <section className="py-11">
          <div className="grid grid-cols-2 gap-3.5 md:grid-cols-4">
            <Card
              k="Arrive within 3 min"
              v={s.stats.punctual === null ? "n/a" : `${s.stats.punctual}%`}
              note={`National average ${meta.nationalPunctual}%`}
            />
            <Card
              k="Stops cancelled"
              v={s.stats.cancelled === null ? "n/a" : `${s.stats.cancelled}%`}
              note={`National average ${meta.nationalCancel}%`}
            />
            <Card
              k="Trains per day"
              v={s.stats.perDay === null ? "n/a" : Math.round(s.stats.perDay).toLocaleString()}
              note={`${s.stats.scheduled.toLocaleString()} scheduled stops`}
            />
            <Card
              k="Data coverage"
              v={s.stats.coverage === null ? "n/a" : `${s.stats.coverage}%`}
              note="Share of stops actually measured"
            />
          </div>

          {lowCoverage && (
            <div className="mt-3.5 flex gap-2.5 rounded-card border border-notice-line bg-ok-bg px-3.5 py-3 text-[13.5px] text-notice-ink">
              <span>
                <strong className="font-demi">Treat this score with caution.</strong> Only{" "}
                {s.stats.coverage}% of stops at {s.name} are measured by the ORR, so its punctuality
                rests on a thin sample. The score is pulled toward the national average to
                compensate.
              </span>
            </div>
          )}
        </section>

        {s.history.length > 1 && (
          <section className="pb-11">
            <BlockHead
              title="Punctuality over time"
              sub={`${periodLong(meta.windowFrom)} to ${periodLong(meta.windowTo)}`}
            />
            <HistoryChart history={s.history} national={meta.nationalPunctual} />
          </section>
        )}

        <section className="pb-11">
          <BlockHead title="Details" />
          <TableCard>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <tbody className="[&>tr:last-child>td]:border-b-0">
                  <Row k="Region" v={s.region || "n/a"} />
                  <Row k="Station facility owner" v={s.owner || "n/a"} />
                  <Row
                    k="Operators calling"
                    v={s.operators.length ? (
                      <div className="flex flex-wrap gap-[7px]">
                        {s.operators.map((o) => (
                          <span
                            key={o}
                            className="rounded-full border border-line px-[11px] py-[5px] text-[13px] text-ink-2"
                          >
                            {o}
                          </span>
                        ))}
                      </div>
                    ) : "n/a"}
                  />
                  <Row
                    k="Annual entries and exits"
                    v={s.stats.footfall === null ? "n/a" : s.stats.footfall.toLocaleString()}
                  />
                  <Row
                    k="Annual interchanges"
                    v={s.stats.interchanges === null ? "n/a" : s.stats.interchanges.toLocaleString()}
                  />
                  <Row k="Scheduled stops" v={s.stats.scheduled.toLocaleString()} />
                  <Row k="Measured stops" v={s.stats.recorded.toLocaleString()} />
                </tbody>
              </table>
            </div>
          </TableCard>
        </section>
      </Wrap>
    </>
  );
}

function MeterRow({
  label,
  hint,
  score,
  value,
  summary = false,
}: {
  label: string;
  hint?: string;
  score: number | null;
  value: React.ReactNode;
  summary?: boolean;
}) {
  return (
    <div
      className={`grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-2 py-[9px] sm:grid-cols-[132px_1fr_116px] sm:gap-x-3.5 sm:gap-y-0 ${
        summary ? "mt-1 border-t border-line pt-3.5" : ""
      }`}
    >
      <span className={`order-1 text-sm ${summary ? "font-demi" : "font-book"}`} title={hint}>
        {label}
      </span>
      <span className="order-3 col-span-2 sm:order-2 sm:col-span-1">
        <MeterFill score={score} />
      </span>
      <span className="order-2 text-right text-[13px] text-ink-3 sm:order-3">{value}</span>
    </div>
  );
}

function Card({ k, v, note }: { k: string; v: string; note: string }) {
  return (
    <div className="rounded-card border border-line px-4 py-3.5">
      <div className="text-[12.5px] text-ink-3">{k}</div>
      <div className="mt-0.5 text-[21px] font-figure tracking-[-0.02em] tabular-nums">{v}</div>
      <div className="mt-0.5 text-xs text-ink-3">{note}</div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <tr>
      <td className={`${TD} w-[38%] align-top text-ink-3 sm:w-[220px]`}>{k}</td>
      <td className={`${TD} align-top`}>{v}</td>
    </tr>
  );
}
