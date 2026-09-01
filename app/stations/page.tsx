import type { Metadata } from "next";
import LeagueTable from "./league-table";
import { getIndex, getMeta } from "@/lib/data";
import { periodLong } from "@/lib/period";
import { Wrap } from "../ui";

export const metadata: Metadata = {
  title: "All stations",
  description: "Every railway station in Great Britain, ranked by station score.",
};

export default function StationsPage() {
  const index = getIndex();
  const meta = getMeta();

  return (
    <Wrap>
      <section className="py-11">
        <div className="mb-4">
          <h2 className="text-[19px] font-semi">Every station, ranked</h2>
          <div className="mt-1 text-[13.5px] text-ink-3">
            {meta.stationCount.toLocaleString()} stations, {periodLong(meta.windowFrom)} to{" "}
            {periodLong(meta.windowTo)}. Every score is a percentile - the share of stations it
            beats. Click any column to sort.
          </div>
        </div>

        <LeagueTable initial={index.slice(0, 100)} total={index.length} />
      </section>
    </Wrap>
  );
}
