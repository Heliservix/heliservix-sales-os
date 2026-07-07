import { AppShell } from "@/components/layout/app-shell";
import { CommandPanel } from "@/components/dashboard/command-panel";
import { CountryExposure } from "@/components/dashboard/country-exposure";
import { MetricCard } from "@/components/dashboard/metric-card";
import { ReadinessGrid } from "@/components/dashboard/readiness-grid";
import { Timeline } from "@/components/dashboard/timeline";
import { Panel } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status-pill";
import {
  commandPanels,
  countryExposure,
  executiveMetrics,
  focusCards,
  operationalTimeline,
  readinessSignals
} from "@/lib/dashboard-data";

export default function DashboardPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-[1500px]">
        <section className="mb-6 overflow-hidden rounded-lg border border-line bg-white/76 shadow-panel backdrop-blur-xl dark:bg-canvas-muted/72">
          <div className="grid gap-6 p-6 lg:grid-cols-[1.4fr_0.6fr] lg:p-8">
            <div>
              <StatusPill tone="teal">Commercial Intelligence Platform</StatusPill>
              <h1 className="mt-5 max-w-4xl text-3xl font-semibold tracking-normal text-ink sm:text-4xl">
                Executive command for helicopter-supported tuna fleet operations.
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-ink-muted">
                HeliServiX connects commercial pipeline, fleet-owner intelligence, contract readiness,
                aircraft availability, maintenance signals, documents, campaigns, and market movement
                into one operational dashboard.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  className="h-11 rounded-md bg-ink px-4 text-sm font-semibold text-white shadow-control transition hover:opacity-92 dark:bg-white dark:text-ink"
                >
                  Review command center
                </button>
                <button
                  type="button"
                  className="h-11 rounded-md border border-line bg-white px-4 text-sm font-semibold text-ink shadow-control transition hover:bg-canvas-muted dark:bg-canvas-muted"
                >
                  Prepare account brief
                </button>
              </div>
            </div>
            <div className="grid content-start gap-3">
              {focusCards.map((card) => {
                const Icon = card.icon;
                return (
                  <article key={card.title} className="rounded-lg border border-line bg-canvas-muted/72 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-semibold uppercase text-ink-subtle">{card.eyebrow}</p>
                      <Icon className="h-4 w-4 text-ink-subtle" aria-hidden="true" />
                    </div>
                    <h2 className="mt-3 text-sm font-semibold text-ink">{card.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-ink-subtle">{card.body}</p>
                    <p className="mt-3 text-sm font-semibold text-aviation-teal">{card.cta}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {executiveMetrics.map((metric) => (
            <MetricCard key={metric.label} {...metric} />
          ))}
        </section>

        <section className="mt-6 grid gap-4 xl:grid-cols-3">
          {commandPanels.map((panel) => (
            <CommandPanel key={panel.title} {...panel} />
          ))}
        </section>

        <section className="mt-6 grid gap-4 xl:grid-cols-[1fr_0.85fr]">
          <ReadinessGrid signals={readinessSignals} />
          <Timeline items={operationalTimeline} />
        </section>

        <section className="mt-6 grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <CountryExposure rows={countryExposure} />
          <Panel>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-ink">Version 0.1 scope</h2>
                <p className="mt-1 text-sm text-ink-subtle">UI architecture without business execution logic.</p>
              </div>
              <StatusPill tone="green">Ready for review</StatusPill>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                "Responsive application shell",
                "Sidebar module architecture",
                "Top navigation and command controls",
                "Executive dashboard surfaces",
                "Dark-mode-ready design tokens",
                "Reusable components and typed data"
              ].map((item) => (
                <div key={item} className="rounded-lg border border-line bg-canvas-muted/60 p-4">
                  <p className="text-sm font-medium text-ink">{item}</p>
                </div>
              ))}
            </div>
          </Panel>
        </section>
      </div>
    </AppShell>
  );
}
