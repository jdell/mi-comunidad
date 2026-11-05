import { formatCents } from "@/lib/format";

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** Accessible SVG bar chart of MRR by month (no client JS). */
export function MrrChart({ data }: { data: { month: string; mrrCents: number }[] }) {
  const max = Math.max(...data.map((d) => d.mrrCents), 100);
  const w = 640;
  const h = 220;
  const pad = { top: 24, bottom: 28, left: 8, right: 8 };
  const bw = (w - pad.left - pad.right) / data.length;
  return (
    <figure>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full" role="img" aria-label="Evolución del MRR en los últimos 12 meses">
        <line x1={pad.left} x2={w - pad.right} y1={h - pad.bottom} y2={h - pad.bottom} className="stroke-border" />
        {data.map((d, i) => {
          const bh = ((h - pad.top - pad.bottom) * d.mrrCents) / max;
          const x = pad.left + i * bw + bw * 0.15;
          const y = h - pad.bottom - bh;
          const [, m] = d.month.split("-");
          const last = i === data.length - 1;
          return (
            <g key={d.month}>
              <title>{`${d.month}: ${formatCents(d.mrrCents)}`}</title>
              <rect x={x} y={y} width={bw * 0.7} height={Math.max(bh, 1)} rx={4} className={last ? "fill-primary" : "fill-primary/45"} />
              {(last || d.mrrCents === max) && d.mrrCents > 0 && (
                <text x={x + bw * 0.35} y={y - 6} textAnchor="middle" className="fill-foreground text-[11px] font-medium">
                  {formatCents(d.mrrCents, { round: true })}
                </text>
              )}
              <text x={x + bw * 0.35} y={h - 8} textAnchor="middle" className="fill-muted-foreground text-[11px]">
                {MONTHS[Number(m) - 1]}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="sr-only">
        {data.map((d) => `${d.month}: ${formatCents(d.mrrCents)}`).join(", ")}
      </figcaption>
    </figure>
  );
}
