import { AppShell } from "@/components/layout/app-shell";
import { ForecastTable } from "@/components/fleet/forecast-table";
import { PageHeader } from "@/components/fleet/page-header";
import { Panel } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status-pill";
import { maintenanceForecasts } from "@/lib/fleet-data";
import { TrendingUp } from "lucide-react";

export default function ForecastPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-[1500px]">
        <PageHeader
          eyebrow="Maintenance Forecast"
          title="Due-date exposure, overhaul planning, and maintenance reserve outlook."
          description="Forecast component due dates from monthly flight-hour trends, identify critical procurement timing, and surface reserve requirements before campaign commitments."
          icon={TrendingUp}
          status="180-day planning model"
        />

        <section className="grid gap-4 md:grid-cols-3">
          <Panel>
            <StatusPill tone="red">Immediate</StatusPill>
            <p className="mt-4 text-3xl font-semibold text-ink">$92K</p>
            <p className="mt-2 text-sm text-ink-subtle">Grounding-related overhaul exposure.</p>
          </Panel>
          <Panel>
            <StatusPill tone="amber">60 Days</StatusPill>
            <p className="mt-4 text-3xl font-semibold text-ink">$18.4K</p>
            <p className="mt-2 text-sm text-ink-subtle">Hydraulic servo procurement window.</p>
          </Panel>
          <Panel>
            <StatusPill tone="blue">180 Days</StatusPill>
            <p className="mt-4 text-3xl font-semibold text-ink">$24.5K</p>
            <p className="mt-2 text-sm text-ink-subtle">Tail rotor gearbox quote planning.</p>
          </Panel>
        </section>

        <Panel className="mt-6">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-ink">Forecast Table</h2>
              <p className="mt-1 text-sm text-ink-subtle">Mock trend-based forecast designed for future backend calculation.</p>
            </div>
            <StatusPill tone="teal">{maintenanceForecasts.length} projections</StatusPill>
          </div>
          <ForecastTable forecasts={maintenanceForecasts} />
        </Panel>

        <section className="mt-6 grid gap-4 lg:grid-cols-3">
          {maintenanceForecasts.map((forecast) => (
            <Panel key={forecast.id}>
              <StatusPill tone={forecast.confidence === "High" ? "green" : "amber"}>{forecast.confidence} confidence</StatusPill>
              <h2 className="mt-4 text-lg font-semibold text-ink">{forecast.helicopterRegistration}</h2>
              <p className="mt-2 text-sm leading-6 text-ink-subtle">{forecast.componentName} is projected for {forecast.estimatedDueDate} based on {forecast.monthlyHourTrend} monthly hours.</p>
              <div className="mt-4 rounded-lg border border-line bg-canvas-muted/58 p-4">
                <p className="text-xs font-semibold uppercase text-ink-subtle">Procurement</p>
                <p className="mt-2 text-sm font-semibold text-ink">{forecast.procurementTiming}</p>
              </div>
            </Panel>
          ))}
        </section>
      </div>
    </AppShell>
  );
}
