import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/fleet/page-header";
import { Panel } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status-pill";
import { alertsForHelicopter, getComponent, getHelicopter, replacementEvents } from "@/lib/fleet-data";
import { componentTone } from "@/components/fleet/status-utils";
import { Wrench } from "lucide-react";
import { notFound } from "next/navigation";

type ComponentDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ComponentDetailPage({ params }: ComponentDetailPageProps) {
  const { id } = await params;
  const component = getComponent(id);

  if (!component) {
    notFound();
  }

  const helicopter = getHelicopter(component.helicopterRegistration);
  const alerts = alertsForHelicopter(component.helicopterRegistration).filter((alert) => alert.componentId === component.id);
  const replacements = replacementEvents.filter((event) => event.helicopterRegistration === component.helicopterRegistration);

  return (
    <AppShell>
      <div className="mx-auto max-w-[1300px]">
        <PageHeader
          eyebrow="Component Detail"
          title={`${component.componentName} / ${component.helicopterRegistration}`}
          description={`${component.category} component ${component.partNumber} with serial ${component.serialNumber}, installed on ${component.installationDate}.`}
          icon={Wrench}
          status={component.status}
        />

        <div className="mb-6 flex justify-end">
          <a className="inline-flex h-10 items-center justify-center rounded-md border border-line bg-white px-4 text-sm font-semibold text-ink shadow-control transition hover:bg-canvas-muted dark:bg-canvas-muted" href={`/components/${component.id}/edit`}>
            Edit component
          </a>
        </div>

        <section className="grid gap-4 md:grid-cols-4">
          <Panel>
            <StatusPill tone={componentTone(component.status)}>Status</StatusPill>
            <p className="mt-4 text-2xl font-semibold text-ink">{component.status}</p>
            <p className="mt-2 text-sm text-ink-subtle">{component.remainingPercentage.toFixed(1)}% remaining.</p>
          </Panel>
          <Panel>
            <StatusPill tone="blue">Remaining Hours</StatusPill>
            <p className="mt-4 text-2xl font-semibold text-ink">{component.remainingHours.toFixed(1)}</p>
            <p className="mt-2 text-sm text-ink-subtle">Life limit {component.lifeLimitHours.toFixed(0)} hours.</p>
          </Panel>
          <Panel>
            <StatusPill tone={component.remainingCalendarDays <= 0 ? "red" : "teal"}>Calendar</StatusPill>
            <p className="mt-4 text-2xl font-semibold text-ink">{component.remainingCalendarDays}</p>
            <p className="mt-2 text-sm text-ink-subtle">Days to {component.calendarLimitDate}.</p>
          </Panel>
          <Panel>
            <StatusPill tone="neutral">Documents</StatusPill>
            <p className="mt-4 text-2xl font-semibold text-ink">{component.documents}</p>
            <p className="mt-2 text-sm text-ink-subtle">Attached maintenance records.</p>
          </Panel>
        </section>

        <section className="mt-6 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <Panel>
            <h2 className="text-lg font-semibold text-ink">Component Identity</h2>
            <div className="mt-5 grid gap-3 text-sm">
              {[
                ["Aircraft", component.helicopterRegistration],
                ["Aircraft Model", helicopter?.model ?? "Unknown"],
                ["Category", component.category],
                ["Part Number", component.partNumber],
                ["Serial Number", component.serialNumber],
                ["Position", component.position],
                ["Installation Date", component.installationDate]
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-4 rounded-lg border border-line bg-canvas-muted/58 p-4">
                  <span className="text-ink-subtle">{label}</span>
                  <span className="font-semibold text-ink">{value}</span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel>
            <h2 className="text-lg font-semibold text-ink">Life Calculation Snapshot</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-line bg-canvas-muted/58 p-4">
                <p className="text-xs font-semibold uppercase text-ink-subtle">TSN</p>
                <p className="mt-3 text-2xl font-semibold text-ink">{component.tsnHours.toFixed(1)}</p>
              </div>
              <div className="rounded-lg border border-line bg-canvas-muted/58 p-4">
                <p className="text-xs font-semibold uppercase text-ink-subtle">TSO</p>
                <p className="mt-3 text-2xl font-semibold text-ink">{component.tsoHours.toFixed(1)}</p>
              </div>
              <div className="rounded-lg border border-line bg-canvas-muted/58 p-4 md:col-span-2">
                <p className="text-xs font-semibold uppercase text-ink-subtle">Notes</p>
                <p className="mt-3 text-sm leading-6 text-ink-subtle">{component.notes}</p>
              </div>
            </div>
          </Panel>
        </section>

        <section className="mt-6 grid gap-4 xl:grid-cols-2">
          <Panel>
            <h2 className="text-lg font-semibold text-ink">Linked Alerts</h2>
            <div className="mt-5 grid gap-3">
              {alerts.length > 0 ? (
                alerts.map((alert) => (
                  <article key={alert.id} className="rounded-lg border border-line bg-canvas-muted/58 p-4">
                    <StatusPill tone="red">{alert.severity}</StatusPill>
                    <p className="mt-3 text-sm font-semibold text-ink">{alert.alertType}</p>
                    <p className="mt-2 text-sm leading-6 text-ink-subtle">{alert.description}</p>
                  </article>
                ))
              ) : (
                <p className="text-sm text-ink-subtle">No component-specific alerts in mock data.</p>
              )}
            </div>
          </Panel>
          <Panel>
            <h2 className="text-lg font-semibold text-ink">Recent Replacement Context</h2>
            <div className="mt-5 grid gap-3">
              {replacements.length > 0 ? (
                replacements.map((event) => (
                  <article key={event.id} className="rounded-lg border border-line bg-canvas-muted/58 p-4">
                    <p className="text-sm font-semibold text-ink">{event.installedComponent}</p>
                    <p className="mt-2 text-sm leading-6 text-ink-subtle">{event.reason}</p>
                  </article>
                ))
              ) : (
                <p className="text-sm text-ink-subtle">No replacement context for this aircraft.</p>
              )}
            </div>
          </Panel>
        </section>
      </div>
    </AppShell>
  );
}
