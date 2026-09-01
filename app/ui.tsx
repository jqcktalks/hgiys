import { band, type Band } from "@/lib/band";

const BADGE_BAND: Record<Band, string> = {
  good: "bg-good-bg text-good",
  ok: "bg-ok-bg text-ok",
  poor: "bg-poor-bg text-poor",
  none: "bg-line-2 text-ink-3",
};

const FILL_BAND: Record<Band, string> = {
  good: "bg-good",
  ok: "bg-ok",
  poor: "bg-poor",
  none: "bg-ink-3",
};

export function Wrap({
  children,
  narrow = false,
  className = "",
}: {
  children: React.ReactNode;
  narrow?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`mx-auto w-full px-4 sm:px-6 ${narrow ? "max-w-[760px]" : "max-w-[1080px]"} ${className}`}
    >
      {children}
    </div>
  );
}

export function Badge({
  score,
  size = "sm",
}: {
  score: number | null;
  size?: "sm" | "lg";
}) {
  return (
    <span
      className={[
        "inline-flex items-center justify-center font-figure tabular-nums",
        size === "lg"
          ? "min-w-[68px] rounded-[10px] px-4 py-2 text-[26px] tracking-[-0.02em]"
          : "min-w-[42px] rounded-[7px] px-[9px] py-[3px] text-sm",
        BADGE_BAND[band(score)],
      ].join(" ")}
    >
      {score ?? "n/a"}
    </span>
  );
}

export function CrsTag({ crs, className = "" }: { crs: string; className?: string }) {
  return (
    <span
      className={`ml-[7px] inline-block rounded-[4px] bg-line-2 px-[5px] py-px align-[2px] text-[10.5px] font-semi tracking-[0.04em] text-ink-3 ${className}`}
    >
      {crs}
    </span>
  );
}

export function TableCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-card border border-line">{children}</div>
  );
}

export function BlockHead({
  title,
  sub,
}: {
  title: React.ReactNode;
  sub?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-baseline justify-between gap-4">
      <h2 className="text-[19px] font-semi">{title}</h2>
      {sub ? <span className="text-[13.5px] text-ink-3">{sub}</span> : null}
    </div>
  );
}

export const TABLE = "w-full border-collapse text-sm";
export const TH =
  "border-b border-line bg-bg-2 px-[14px] py-[10px] text-[11.5px] font-semibold tracking-[0.05em] text-ink-3 uppercase whitespace-nowrap";
export const LEFT = "text-left";
export const TD = "border-b border-line-2 px-[14px] py-[10px]";
export const NUM = "text-center tabular-nums";
export const SECONDARY = "hidden md:table-cell";

export function MeterFill({ score }: { score: number | null }) {
  return (
    <span className="meter-bar h-2 overflow-hidden rounded-[5px] bg-line-2">
      <span
        className={`meter-bar h-full min-w-[5px] rounded-[5px] ${FILL_BAND[band(score)]}`}
        style={{ width: `${Math.max(score ?? 0, 1)}%` }}
      />
    </span>
  );
}
