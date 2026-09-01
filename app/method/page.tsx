import type { Metadata } from "next";
import { getMeta } from "@/lib/data";
import { periodLong } from "@/lib/period";

export const metadata: Metadata = {
  title: "Method",
  description: "How the station score is worked out, and what it cannot tell you.",
};

export default function MethodPage() {
  const meta = getMeta();
  const w = meta.weights;

  return (
    <div
      className={[
        "mx-auto w-full max-w-[760px] px-4 pt-11 sm:px-6",
        "[&_h2]:mt-8 [&_h2]:mb-2.5 [&_h2]:text-xl [&_h2]:font-semi",
        "[&_h3]:mt-6 [&_h3]:mb-1.5 [&_h3]:text-base [&_h3]:font-semi",
        "[&_p]:mb-[13px] [&_p]:text-ink-2",
        "[&_ul]:mb-[13px] [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:text-ink-2",
        "[&_li]:my-[5px]",
        "[&_strong]:font-demi [&_strong]:text-ink",
        "[&_a]:text-accent [&_a]:hover:underline",
        "[&_th]:border-b [&_th]:border-line-2 [&_th]:px-3 [&_th]:py-[9px] [&_th]:text-left [&_th]:text-[11.5px] [&_th]:tracking-[0.05em] [&_th]:text-ink-3 [&_th]:uppercase",
        "[&_td]:border-b [&_td]:border-line-2 [&_td]:px-3 [&_td]:py-[9px] [&_td]:text-left",
      ].join(" ")}
    >
      <h1 className="mb-2.5 text-[26px] font-bold sm:text-[30px]">Method</h1>
      <p className="text-base">
        Every score here comes from data the Office of Rail and Road publishes openly. There is no
        survey and no private feed.
      </p>

      <h2>The data</h2>
      <p>
        <strong>ORR Table 3130</strong> reports, for every station and every four-week railway
        period, how many stops were scheduled, how many were actually measured, what share arrived
        within three minutes of schedule, and what share were cancelled.{" "}
        <strong>Table 1410</strong> supplies the three-letter code, region and footfall.
      </p>
      <p>
        Scores use the most recent <strong>{meta.periods} periods</strong> (
        {periodLong(meta.windowFrom)} to {periodLong(meta.windowTo)}), roughly a year. That is long
        enough to survive one bad month without describing a station as it was years ago. A railway
        period is four weeks; the rail year starts in April, so &ldquo;2025/26 P05&rdquo; is the
        four weeks around August 2025. Charts here show the month instead.
      </p>

      <h2>The four measures</h2>
      <div className="mb-4 overflow-x-auto">
        <table className="w-full min-w-[480px] border-collapse text-sm">
          <thead>
            <tr><th>Measure</th><th>Weight</th><th>Built from</th></tr>
          </thead>
          <tbody>
            <tr><td><strong>Reliability</strong></td><td>{pct(w.reliability)}</td><td>Share of stops arriving within 3 minutes</td></tr>
            <tr><td><strong>Cancellations</strong></td><td>{pct(w.cancellations)}</td><td>Share of scheduled stops cancelled</td></tr>
            <tr><td><strong>Frequency</strong></td><td>{pct(w.frequency)}</td><td>Scheduled stops per day</td></tr>
            <tr><td><strong>Connectivity</strong></td><td>{pct(w.connectivity)}</td><td>Operators calling, and interchange volume</td></tr>
          </tbody>
        </table>
      </div>

      <h2>How a sub-score works</h2>
      <p>
        Each measure becomes a <strong>percentile rank</strong> across all scored stations. A
        reliability score of 80 means the station beats 80% of British stations on punctuality. It
        does not mean 80% of its trains are on time. The raw percentages sit next to the score on
        every station page.
      </p>
      <p>
        Percentiles are used instead of raw percentages because the distributions are heavily
        skewed. A few termini handle thousands of trains a day while hundreds of rural halts see a
        dozen, and a straight average would be dominated by the extremes.
      </p>

      <h3>The headline score</h3>
      <p>
        The four sub-scores are blended using the weights above, and that blend is then converted
        to a percentile in its own right. The second step matters: averaging four percentiles pulls
        every station toward the middle, so the raw blend spans only about 12 to 93 and a blend of
        80 would really sit near the 97th percentile. Percentiling it again means the headline
        number carries the same meaning as the sub-scores &mdash; <strong>a score of 40 is a station
        that rates better than 40% of British stations</strong>, all four measures taken together.
      </p>
      <p>
        Because it is a percentile, the scores are spread evenly by construction: a tenth of
        stations sit below 10, half sit below 50, and the very best and worst dozen round to 100
        and 0. A score is a position in the table, not a mark out of 100.
      </p>

      <h3>Thin samples</h3>
      <p>
        The ORR does not measure every stop. Coverage sits above 95% at most large stations but can
        drop below half at quiet ones, where a few hundred measured stops can produce a freakishly
        good or bad figure by chance.
      </p>
      <p>
        Each station&apos;s punctuality is therefore pulled toward the national average in
        proportion to how little of it was measured. A station with very few measured stops ends up
        close to average; one with tens of thousands barely shifts. Anything under 60% coverage
        carries a warning on its page.
      </p>

      <h2>What it does not tell you</h2>
      <ul>
        <li>
          <strong>Nothing about time of day or day of week.</strong> ORR data is aggregated over
          four-week periods, so it cannot say whether Friday evenings are worse than Tuesday
          mornings. That needs per-train history.
        </li>
        <li>
          <strong>Three minutes is a blunt cutoff.</strong> A train 2 minutes 55 seconds late counts
          as punctual. One at 3 minutes 5 seconds does not.
        </li>
        <li>
          <strong>Frequency and connectivity reward size.</strong> A quiet, perfectly punctual rural
          station still scores modestly, because it genuinely offers fewer trains and fewer places
          to go. Read the sub-scores, not just the headline number.
        </li>
        <li>
          <strong>Nothing about the station itself.</strong> Staffing, step-free access, shelter and
          parking are not included.
        </li>
        <li>
          <strong>{meta.noScoreCount} stations are unscored</strong> because too little of their
          service is measured to say anything honest about it.
        </li>
      </ul>

      <h2>Sources</h2>
      <ul>
        {meta.sources.map((s) => (
          <li key={s.url}>
            <a href={s.url} rel="noreferrer">{s.name}</a>, {s.licence}
          </li>
        ))}
      </ul>
      <p className="!text-ink-3 text-[13px]">
        Contains public sector information licensed under the Open Government Licence v3.0. Last
        updated {new Date(meta.generated).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}.
      </p>
    </div>
  );
}

function pct(n: number) {
  return `${Math.round(n * 100)}%`;
}
