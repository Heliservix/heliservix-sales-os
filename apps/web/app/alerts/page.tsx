import { AppShell } from "@/components/layout/app-shell";
import { AlertsList } from "@/components/fleet/alerts-list";
import { PageHeader } from "@/components/fleet/page-header";
import { Panel } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status-pill";
import { maintenanceAlerts } from "@/lib/fleet-data";
import { AlertTriangle } from "lucide-react";

export default function AlertsPage() {
  const summary = ["Grounding", "Critical", "Monitor", "Info"].map((severity) => ({
    severity,
    count: maintenanceAlerts.filter((alert) => alert.severity === severity).length
  }));

  return (
    <AppShell>
      <div className="mx-auto max-w-[1300px]">
        <PageHeader
          eyebrow="Maintenance Alerts"
          title="Operationally relevant alerts for component, calendar, and data exposure."
          description="Prioritize grounding events, critical hourly limits, monitor thresholds, calendar exposure, and import-data gaps before aircraft assignment."
          icon={AlertTriangle}
          status={`${maintenanceAlerts.length} active alerts`}
        />

        <section className="grid gap-4 md:grid-cols-4">
          {summary.map((item) => (
            <Panel key={item.severity}>
              <StatusPill tone={item.severity === "Grounding" || item.severity === "Critical" ? "red" : item.severity === "Monitor" ? "amber" : "blue"}>{item.severity}</StatusPill>
              <p className="mt-4 text-3xl font-semibold text-ink">{item.count}</p>
              <p className="mt-2 text-sm text-ink-subtle">Current alert count.</p>
            </Panel>
          ))}
        </section>

        <Panel className="mt-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-ink">Alert Queue</h2>
              <p className="mt-1 text-sm text-ink-subtle">MVP list for maintenance triage and assignment readiness review.</p>
            </div>
            <StatusPill tone="teal">Severity sorted</StatusPill>
          </div>
          <AlertsList alerts={maintenanceAlerts} />
        </Panel>
      </div>
    </AppShell>
  );
}
