import { memo } from "react";
import type { DashboardMetric } from "@/types/fleet";
import { StatusPill } from "@/components/ui/status-pill";

function FleetMetricCardComponent({ label, value, detail, tone, icon: Icon }: DashboardMetric) {
  return (
    <article className="group rounded-lg border border-line bg-white/84 p-5 shadow-panel backdrop-blur-xl transition duration-150 hover:-translate-y-0.5 hover:border-aviation-blue/25 dark:bg-canvas-muted/72">
      <div className="flex items-start justify-between gap-4">
        <div className="grid h-10 w-10 place-items-center rounded-lg border border-line bg-canvas-muted text-ink transition group-hover:border-aviation-blue/25 group-hover:text-aviation-blue">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
        <StatusPill tone={tone}>{label}</StatusPill>
      </div>
      <p className="mt-5 text-3xl font-semibold leading-none text-ink">{value}</p>
      <p className="mt-3 text-sm leading-6 text-ink-subtle">{detail}</p>
    </article>
  );
}

export const FleetMetricCard = memo(FleetMetricCardComponent);
