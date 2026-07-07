import { AppShell } from "@/components/layout/app-shell";
import { AlertsList } from "@/components/fleet/alerts-list";
import { ComponentsTable } from "@/components/fleet/components-table";
import { FleetMetricCard } from "@/components/fleet/fleet-metric-card";
import { ForecastTable } from "@/components/fleet/forecast-table";
import { HelicopterCard } from "@/components/fleet/helicopter-card";
import { PageHeader } from "@/components/fleet/page-header";
import { Panel } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status-pill";
import {
  components,
  fleetActivity,
  fleetMetrics,
  helicopters,
  maintenanceAlerts,
  maintenanceForecasts
} from "@/lib/fleet-data";
import { Plane } from "lucide-react";

export default function DashboardPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-[1500px]">
        <PageHeader
          eyebrow="Fleet & Maintenance Operations"
          title="Multi-helicopter control for tuna-vessel aviation campaigns."
          description="Track aircraft readiness, controlled components, flight-hour impact, maintenance alerts, and reserve exposure across Panama, Ecuador, Colombia, and future Latin American operations."
          icon={Plane}
          status="Frontend MVP with typed mock data"
        />

        <section className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
          {fleetMetrics.map((metric) => (
            <FleetMetricCard key={metric.label} {...metric} />
          ))}
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
          {helicopters.map((helicopter) => (
            <HelicopterCard key={helicopter.registration} helicopter={helicopter} />
          ))}
        </section>

        <section className="mt-6 grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
          <Panel>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-ink">Controlled components</h2>
                <p className="mt-1 text-sm text-ink-subtle">Hour and calendar exposure by aircraft.</p>
              </div>
              <StatusPill tone="teal">{components.length} records</StatusPill>
            </div>
            <div className="mt-5">
              <ComponentsTable components={components.slice(0, 4)} compact />
            </div>
          </Panel>

          <Panel>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-ink">Operational signal</h2>
                <p className="mt-1 text-sm text-ink-subtle">Latest readiness movement and maintenance planning activity.</p>
              </div>
              <StatusPill tone="amber">Live model mock</StatusPill>
            </div>
            <div className="mt-5 grid gap-3">
              {fleetActivity.map((item) => {
                const Icon = item.icon;
                return (
                  <article key={item.title} className="rounded-lg border border-line bg-canvas-muted/58 p-4">
                    <div className="flex gap-3">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-line bg-white text-ink dark:bg-canvas-muted">
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-semibold text-ink">{item.title}</h3>
                          <StatusPill tone={item.tone}>{item.time}</StatusPill>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-ink-subtle">{item.description}</p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </Panel>
        </section>

        <section className="mt-6 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <Panel>
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-ink">Maintenance alerts</h2>
                <p className="mt-1 text-sm text-ink-subtle">Grounding, critical, monitor, and data quality items.</p>
              </div>
              <StatusPill tone="red">1 grounding</StatusPill>
            </div>
            <AlertsList alerts={maintenanceAlerts.slice(0, 3)} />
          </Panel>
          <Panel>
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-ink">Maintenance forecast</h2>
                <p className="mt-1 text-sm text-ink-subtle">Due exposure, reserve planning, and procurement timing.</p>
              </div>
              <StatusPill tone="blue">180-day view</StatusPill>
            </div>
            <ForecastTable forecasts={maintenanceForecasts} />
          </Panel>
        </section>
      </div>
    </AppShell>
  );
}
