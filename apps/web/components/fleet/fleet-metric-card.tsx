import type { DashboardMetric } from "@/types/fleet";
import { StatusPill } from "@/components/ui/status-pill";

export function FleetMetricCard({ label, value, detail, tone, icon: Icon }: DashboardMetric) {
  return (
    <article className="rounded-lg border border-line bg-white/78 p-5 shadow-panel backdrop-blur-xl dark:bg-canvas-muted/72">
      <div className="flex items-start justify-between gap-4">
        <div className="grid h-10 w-10 place-items-center rounded-lg border border-line bg-canvas-muted text-ink">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
        <StatusPill tone={tone}>{label}</StatusPill>
      </div>
      <p className="mt-5 text-3xl font-semibold text-ink">{value}</p>
      <p className="mt-2 text-sm leading-6 text-ink-subtle">{detail}</p>
    </article>
  );
}
