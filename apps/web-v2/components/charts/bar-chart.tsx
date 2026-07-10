// See score-gauge.tsx for why this is hand-rolled SVG instead of a library.

export type BarChartDatum = {
  label: string;
  value: number;
  tone?: "green" | "amber" | "red" | "teal" | "neutral";
};

const TONE_COLOR: Record<NonNullable<BarChartDatum["tone"]>, string> = {
  green: "rgb(var(--color-status-green))",
  amber: "rgb(var(--color-status-yellow))",
  red: "rgb(var(--color-status-red))",
  teal: "rgb(var(--color-aviation-teal))",
  neutral: "rgb(var(--color-ink-subtle))"
};

type HorizontalBarChartProps = {
  data: BarChartDatum[];
  height?: number;
};

export function HorizontalBarChart({ data, height = 22 }: HorizontalBarChartProps) {
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <div className="grid gap-2.5">
      {data.map((datum) => {
        const widthPct = (datum.value / max) * 100;
        const color = TONE_COLOR[datum.tone ?? "neutral"];
        return (
          <div key={datum.label} className="grid grid-cols-[minmax(80px,140px)_1fr_auto] items-center gap-3">
            <span className="truncate text-xs font-medium text-ink-muted">{datum.label}</span>
            <svg width="100%" height={height} viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" role="img" aria-label={`${datum.label}: ${datum.value}`}>
              <rect x={0} y={0} width={100} height={height} rx={4} fill="rgb(var(--color-line))" opacity={0.5} />
              <rect x={0} y={0} width={Math.max(2, widthPct)} height={height} rx={4} fill={color} />
            </svg>
            <span className="hsv-technical-value text-xs font-semibold text-ink">{datum.value}</span>
          </div>
        );
      })}
      {!data.length ? <p className="text-xs text-ink-subtle">Sin datos.</p> : null}
    </div>
  );
}
