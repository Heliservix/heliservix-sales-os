// See score-gauge.tsx for why this is hand-rolled SVG instead of a library.

export type DonutSlice = {
  label: string;
  value: number;
  tone: "green" | "amber" | "red" | "teal" | "neutral";
};

const TONE_COLOR: Record<DonutSlice["tone"], string> = {
  green: "rgb(var(--color-status-green))",
  amber: "rgb(var(--color-status-yellow))",
  red: "rgb(var(--color-status-red))",
  teal: "rgb(var(--color-aviation-teal))",
  neutral: "rgb(var(--color-ink-subtle))"
};

type DonutChartProps = {
  slices: DonutSlice[];
  size?: number;
  centerLabel?: string;
};

export function DonutChart({ slices, size = 140, centerLabel }: DonutChartProps) {
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  const radius = size / 2 - 12;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  const segments = slices
    .filter((s) => s.value > 0)
    .reduce<Array<DonutSlice & { dash: number; offset: number }>>((accumulated, slice) => {
      const previousOffset = accumulated.length ? accumulated[accumulated.length - 1].offset + accumulated[accumulated.length - 1].dash : 0;
      const fraction = total > 0 ? slice.value / total : 0;
      const dash = fraction * circumference;
      return [...accumulated, { ...slice, dash, offset: previousOffset }];
    }, []);

  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={centerLabel ?? "Distribución"}>
        <circle cx={center} cy={center} r={radius} fill="none" stroke="rgb(var(--color-line))" strokeWidth={16} opacity={0.5} />
        {segments.map((segment) => (
          <circle
            key={segment.label}
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={TONE_COLOR[segment.tone]}
            strokeWidth={16}
            strokeDasharray={`${segment.dash} ${circumference - segment.dash}`}
            strokeDashoffset={-segment.offset}
            transform={`rotate(-90 ${center} ${center})`}
          />
        ))}
        {centerLabel ? (
          <text x={center} y={center + 5} textAnchor="middle" fontSize={size * 0.16} fontWeight={700} fill="rgb(var(--color-ink))">
            {total}
          </text>
        ) : null}
      </svg>
      <ul className="grid gap-1.5">
        {slices.map((slice) => (
          <li key={slice.label} className="flex items-center gap-2 text-xs text-ink-muted">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: TONE_COLOR[slice.tone] }} />
            <span className="font-medium text-ink">{slice.value}</span>
            <span>{slice.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
