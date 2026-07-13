import { memo } from "react";
import type { MaintenanceAlert } from "@/types/fleet";
import { StatusPill } from "@/components/ui/status-pill";
import { alertTone } from "@/components/fleet/status-utils";

type AlertsListProps = {
  alerts: MaintenanceAlert[];
};

function AlertsListComponent({ alerts }: AlertsListProps) {
  return (
    <div className="grid gap-3">
      {alerts.map((alert) => (
        <article key={alert.id} className="rounded-lg border border-line bg-canvas-muted/58 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill tone={alertTone(alert.severity)}>{alert.severity}</StatusPill>
                <StatusPill tone="neutral">{alert.triggerBasis}</StatusPill>
                <StatusPill tone="neutral">{alert.status}</StatusPill>
              </div>
              <h3 className="mt-3 text-sm font-semibold text-ink">
                {alert.helicopterRegistration} · {alert.componentName}
              </h3>
              <p className="mt-2 text-sm leading-6 text-ink-subtle">{alert.description}</p>
            </div>
            <div className="rounded-md border border-line bg-white/70 p-3 text-sm dark:bg-canvas-muted">
              <p className="font-medium text-ink">{alert.alertType}</p>
              <p className="mt-1 text-xs text-ink-subtle">Owner: {alert.assignedTo}</p>
              {alert.remainingHours !== undefined ? (
                <p className="mt-1 text-xs text-ink-subtle">{alert.remainingHours.toFixed(1)} hrs remaining</p>
              ) : null}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

export const AlertsList = memo(AlertsListComponent);
