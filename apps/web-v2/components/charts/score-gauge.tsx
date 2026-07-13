// Lightweight, dependency-free SVG ring gauge. No charting library is
// installed in this project (and the sandbox can't reach npm to add one), so
// every chart in HSV OS is a small hand-rolled SVG server component like this
// one — zero client JS, zero new dependencies, renders instantly in RSC.

type ScoreGaugeProps = {
  score: number;
  label: string;
  size?: number;
};

function toneColor(score: number): string {
  if (score >= 75) return "rgb(var(--color-status-green))";
  if (score >= 50) return "rgb(var(--color-status-yellow))";
  return "rgb(var(--color-status-red))";
}

export function ScoreGauge({ score, label, size = 128 }: ScoreGaugeProps) {
  const clamped = Math.max(0, Math.min(100, score));
  const radius = size / 2 - 10;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);
  const center = size / 2;
  const color = toneColor(clamped);

  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${label}: ${clamped}%`}>
        <circle cx={center} cy={center} r={radius} fill="none" stroke="rgb(var(--color-line))" strokeWidth={10} />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${center} ${center})`}
        />
        <text x={center} y={center - 2} textAnchor="middle" fontSize={size * 0.22} fontWeight={700} fill="rgb(var(--color-ink))">
          {clamped}
        </text>
        <text x={center} y={center + size * 0.16} textAnchor="middle" fontSize={size * 0.09} fill="rgb(var(--color-ink-subtle))">
          %
        </text>
      </svg>
      <p className="text-sm font-semibold text-ink-muted">{label}</p>
    </div>
  );
}
