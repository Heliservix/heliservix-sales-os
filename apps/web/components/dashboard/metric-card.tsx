import { StatusPill } from "@/components/ui/status-pill";
import { cn } from "@/lib/utils";

type MetricCardProps = {
  label: string;
  value: string;
  detail: string;
  trend: string;
  tone: "green" | "amber" | "blue" | "teal";
};

const accentClasses = {
  green: "from-aviation-green/18",
  amber: "from-aviation-amber/18",
  blue: "from-aviation-blue/18",
  teal: "from-aviation-teal/18"
};

export function MetricCard({ label, value, detail, trend, tone }: MetricCardProps) {
  return (
    <article
      className={cn(
        "rounded-lg border border-line bg-gradient-to-br to-white p-5 shadow-panel dark:to-canvas-muted",
        accentClasses[tone]
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm font-medium text-ink-muted">{label}</p>
        <StatusPill tone={tone}>{trend}</StatusPill>
      </div>
      <p className="mt-5 text-3xl font-semibold tracking-normal text-ink">{value}</p>
      <p className="mt-2 text-sm leading-6 text-ink-subtle">{detail}</p>
    </article>
  );
}
