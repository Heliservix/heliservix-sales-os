import { ArrowUpRight, Gauge, MapPin, Ship } from "lucide-react";
import type { Helicopter } from "@/types/fleet";
import { StatusPill } from "@/components/ui/status-pill";
import { helicopterTone, readinessTone } from "@/components/fleet/status-utils";

type HelicopterCardProps = {
  helicopter: Helicopter;
};

export function HelicopterCard({ helicopter }: HelicopterCardProps) {
  return (
    <a
      href={`/helicopters/${helicopter.registration}`}
      className="group block rounded-lg border border-line bg-white/84 p-5 shadow-panel transition duration-150 hover:-translate-y-0.5 hover:border-aviation-blue/25 hover:shadow-lg dark:bg-canvas-muted/72"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-ink">{helicopter.registration}</p>
          <p className="mt-1 text-sm text-ink-subtle">{helicopter.model}</p>
        </div>
        <ArrowUpRight className="h-4 w-4 text-ink-subtle transition group-hover:text-aviation-blue" aria-hidden="true" />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <StatusPill tone={helicopterTone(helicopter.status)}>{helicopter.status}</StatusPill>
        <StatusPill tone={readinessTone(helicopter.readiness)}>{helicopter.readiness}% ready</StatusPill>
      </div>

      <div className="mt-5 grid gap-3 text-sm text-ink-muted">
        <div className="flex items-center gap-2">
          <Gauge className="h-4 w-4 text-ink-subtle" aria-hidden="true" />
          <span>{helicopter.currentHourmeter.toFixed(1)} hrs</span>
        </div>
        <div className="flex items-center gap-2">
          <Ship className="h-4 w-4 text-ink-subtle" aria-hidden="true" />
          <span>{helicopter.assignedVessel ?? "Unassigned"}</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-ink-subtle" aria-hidden="true" />
          <span>{helicopter.operationArea}</span>
        </div>
      </div>

      <div className="mt-5 rounded-md border border-line bg-canvas-muted/70 p-3 transition group-hover:border-aviation-blue/20">
        <p className="text-xs font-semibold uppercase text-ink-subtle">Next limiting item</p>
        <p className="mt-1 text-sm font-medium text-ink">{helicopter.nextDueComponent}</p>
        <p className="mt-1 text-xs text-ink-subtle">{helicopter.nextDueHours.toFixed(1)} hours remaining</p>
      </div>
    </a>
  );
}
