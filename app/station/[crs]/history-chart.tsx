import type { Station } from "@/lib/types";
import { periodLong, periodShort } from "@/lib/period";

type Point = { label: string; punctual: number };

export default function HistoryChart({
  history,
  national,
}: {
  history: Station["history"];
  national: number;
}) {
  const points = history.filter((h) => h.punctual !== null) as Point[];
  if (points.length < 2) return null;

  return (
    <div className="rounded-card border border-line p-3 sm:p-[18px]">
      <div className="mb-2 text-xs text-ink-3">
        % of trains arriving within 3 minutes of schedule.
      </div>
      <div className="sm:hidden">
        <Plot points={points} national={national} w={380} h={220} labelEvery={3} fontScale={1.45} />
      </div>
      <div className="hidden sm:block">
        <Plot points={points} national={national} w={720} h={190} labelEvery={2} fontScale={1} />
      </div>

      <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-ink-2">
        <span className="flex items-center gap-1.5">
          <i className="inline-block h-[3px] w-2.5 rounded-sm bg-accent" /> This station
        </span>
        <span className="flex items-center gap-1.5">
          <i className="inline-block h-[3px] w-2.5 rounded-sm bg-ink-3" /> National average ({national}%)
        </span>
      </div>

      <table className="sr-only">
        <caption>Punctuality by railway period</caption>
        <thead>
          <tr>
            <th scope="col">Period</th>
            <th scope="col">Arrived within 3 minutes</th>
          </tr>
        </thead>
        <tbody>
          {points.map((p) => (
            <tr key={p.label}>
              <th scope="row">{periodLong(p.label)}</th>
              <td>{p.punctual}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Plot({
  points,
  national,
  w: W,
  h: H,
  labelEvery,
  fontScale,
}: {
  points: Point[];
  national: number;
  w: number;
  h: number;
  labelEvery: number;
  fontScale: number;
}) {
  const values = points.map((p) => p.punctual).concat(national);
  let lo = Math.max(0, Math.min(...values) - 3);
  let hi = Math.min(100, Math.max(...values) + 3);
  if (hi - lo < 10) { const mid = (hi + lo) / 2; lo = Math.max(0, mid - 5); hi = Math.min(100, mid + 5); }
  const step = [5, 10, 20, 25].find((c) => (hi - lo) / c <= 5) ?? 25;
  lo = Math.max(0, Math.floor(lo / step) * step);
  hi = Math.min(100, Math.ceil(hi / step) * step);

  const ticks: number[] = [];
  for (let t = lo; t <= hi + 1e-6; t += step) ticks.push(t);
  const axisFont = 10 * fontScale;
  const tickFont = 9.5 * fontScale;

  const widestTick = Math.max(...ticks.map((t) => `${Math.round(t)}%`.length));
  const PAD = {
    top: 14,
    right: 14,
    bottom: Math.round(16 + tickFont),
    left: Math.ceil(0.58 * axisFont * widestTick) + 10,
  };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const x = (i: number) => PAD.left + (i / (points.length - 1)) * innerW;
  const y = (v: number) => PAD.top + innerH - ((v - lo) / (hi - lo)) * innerH;

  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.punctual).toFixed(1)}`).join(" ");
  const area = `${line} L${x(points.length - 1).toFixed(1)},${(PAD.top + innerH).toFixed(1)} L${x(0).toFixed(1)},${(PAD.top + innerH).toFixed(1)} Z`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="block h-auto w-full"
      role="img"
      aria-label="Punctuality by month over the scoring window"
    >
      {ticks.map((t) => (
        <g key={t}>
          <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--color-line-2)" strokeWidth="1" />
          <text x={PAD.left - 7} y={y(t) + 3.5} textAnchor="end" fontSize={axisFont} fill="var(--color-ink-3)">
            {Math.round(t)}%
          </text>
        </g>
      ))}

      <line
        x1={PAD.left} x2={W - PAD.right} y1={y(national)} y2={y(national)}
        stroke="var(--color-ink-3)" strokeWidth="1" strokeDasharray="4 3" opacity="0.7"
      />

      <path d={area} fill="var(--color-accent)" opacity="0.07" />
      <path d={line} fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

      {points.map((p, i) => (
        <circle
          key={p.label}
          cx={x(i)}
          cy={y(p.punctual)}
          r="2.6"
          fill="var(--color-bg)"
          stroke="var(--color-accent)"
          strokeWidth="1.6"
        />
      ))}

      {points.map((p, i) =>
        i % labelEvery === 0 || i === points.length - 1 ? (
          <text
            key={p.label}
            x={x(i)}
            y={H - 8}
            textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"}
            fontSize={tickFont}
            fill="var(--color-ink-3)"
          >
            {periodShort(p.label)}
          </text>
        ) : null
      )}

      {points.map((p, i) => {
        const px = x(i);
        const py = y(p.punctual);
        const text = `${periodLong(p.label)} · ${p.punctual}%`;
        const tipFont = axisFont;
        const boxW = Math.ceil(0.58 * tipFont * text.length) + 14;
        const boxH = Math.round(tipFont) + 10;
        const above = py - 10 - boxH >= 0;
        const boxY = above ? py - 10 - boxH : py + 10;
        const boxX = Math.max(2, Math.min(W - boxW - 2, px - boxW / 2));
        const hit = Math.max(10, innerW / (points.length - 1) / 2);
        return (
          <g key={p.label} className="group">
            <circle cx={px} cy={py} r={hit} fill="transparent" className="[pointer-events:all]" />
            <circle
              cx={px}
              cy={py}
              r="6"
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth="1.5"
              className="opacity-0 transition-opacity duration-100 group-hover:opacity-100"
            />
            <g className="pointer-events-none opacity-0 transition-opacity duration-100 group-hover:opacity-100">
              <rect x={boxX} y={boxY} width={boxW} height={boxH} rx="4" fill="var(--color-ink)" />
              <text
                x={boxX + boxW / 2}
                y={boxY + boxH / 2}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={tipFont}
                fill="var(--color-bg)"
              >
                {text}
              </text>
            </g>
          </g>
        );
      })}
    </svg>
  );
}
