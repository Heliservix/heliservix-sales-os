// Same dependency-free SVG approach as score-gauge.tsx / bar-chart.tsx — no
// charting library installed, zero client JS, renders instantly in RSC.

export type TrendPoint = { label: string; value: number };

type TrendLineChartProps = {
  data: TrendPoint[];
  height?: number;
  tone?: "teal" | "amber" | "green" | "red";
  valueSuffix?: string;
};

const TONE_COLOR: Record<NonNullable<TrendLineChartProps["tone"]>, string> = {
  teal: "rgb(var(--color-aviation-teal))",
  amber: "rgb(var(--color-status-yellow))",
  green: "rgb(var(--color-status-green))",
  red: "rgb(var(--color-status-red))"
};

export function TrendLineChart({ data, height = 160, tone = "teal", valueSuffix = "" }: TrendLineChartProps) {
  if (!data.length) {
    return <p className="text-xs text-ink-subtle">Sin datos suficientes todavía.</p>;
  }

  const width = 600;
  const paddingX = 8;
  const paddingTop = 16;
  const paddingBottom = 28;
  const plotHeight = height - paddingTop - paddingBottom;
  const max = Math.max(1, ...data.map((d) => d.value));
  const min = Math.min(0, ...data.map((d) => d.value));
  const range = max - min || 1;
  const stepX = data.length > 1 ? (width - paddingX * 2) / (data.length - 1) : 0;
  const color = TONE_COLOR[tone];

  const points = data.map((d, i) => {
    const x = paddingX + stepX * i;
    const y = paddingTop + plotHeight - ((d.value - min) / range) * plotHeight;
    return { x, y, ...d };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${points[points.length - 1].x.toFixed(1)},${(paddingTop + plotHeight).toFixed(1)} L${points[0].x.toFixed(1)},${(paddingTop + plotHeight).toFixed(1)} Z`;

  // Thin out x-axis labels if there are many points, so they don't overlap.
  const labelEvery = data.length > 8 ? Math.ceil(data.length / 8) : 1;

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label="Tendencia">
      <path d={areaPath} fill={color} opacity={0.08} />
      <path d={linePath} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => (
        <g key={`${p.label}-${i}`}>
          <circle cx={p.x} cy={p.y} r={3} fill={color} />
          {i % labelEvery === 0 ? (
            <text x={p.x} y={height - 8} textAnchor="middle" fontSize={11} fill="rgb(var(--color-ink-subtle))">
              {p.label}
            </text>
          ) : null}
        </g>
      ))}
      <text x={points[points.length - 1].x} y={points[points.length - 1].y - 8} textAnchor="end" fontSize={12} fontWeight={700} fill="rgb(var(--color-ink))">
        {data[data.length - 1].value.toFixed(0)}
        {valueSuffix}
      </text>
    </svg>
  );
}
