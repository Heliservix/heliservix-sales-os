import { AppShell } from "@/components/layout/app-shell";
import { AlertsList } from "@/components/fleet/alerts-list";
import { ComponentsTable } from "@/components/fleet/components-table";
import { PageHeader } from "@/components/fleet/page-header";
import { Panel } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status-pill";
import { alertsForHelicopter, componentsForHelicopter, getHelicopter, replacementEvents, vessels } from "@/lib/fleet-data";
import { readinessTone } from "@/components/fleet/status-utils";
import { Plane } from "lucide-react";
import { notFound } from "next/navigation";

type HelicopterDetailPageProps = {
  params: Promise<{ registration: string }>;
};

export default async function HelicopterDetailPage({ params }: HelicopterDetailPageProps) {
  const { registration } = await params;
  const helicopter = getHelicopter(registration);

  if (!helicopter) {
    notFound();
  }

  const helicopterComponents = componentsForHelicopter(helicopter.registration);
  const alerts = alertsForHelicopter(helicopter.registration);
  const vessel = vessels.find((item) => item.name === helicopter.assignedVessel);
  const replacements = replacementEvents.filter((event) => event.helicopterRegistration === helicopter.registration);

  return (
    <AppShell>
      <div className="mx-auto max-w-[1500px]">
        <PageHeader
          eyebrow="Helicopter Detail"
          title={`${helicopter.registration} / ${helicopter.model}`}
          description={`${helicopter.ownerCompany} aircraft assigned to ${helicopter.assignedVessel ?? "no vessel"} in ${helicopter.operationArea}.`}
          icon={Plane}
          status={`${helicopter.currentHourmeter.toFixed(1)} current hours`}
        />

        <section className="grid gap-4 md:grid-cols-4">
          <Panel>
            <StatusPill tone="teal">Serial</StatusPill>
            <p className="mt-4 text-2xl font-semibold text-ink">{helicopter.serialNumber}</p>
            <p className="mt-2 text-sm text-ink-subtle">Manufacture year {helicopter.manufactureYear}</p>
          </Panel>
          <Panel>
            <StatusPill tone={readinessTone(helicopter.readiness)}>Readiness</StatusPill>
            <p className="mt-4 text-2xl font-semibold text-ink">{helicopter.readiness}%</p>
            <p className="mt-2 text-sm text-ink-subtle">{helicopter.status}</p>
          </Panel>
          <Panel>
            <StatusPill tone="blue">Next Due</StatusPill>
            <p className="mt-4 text-2xl font-semibold text-ink">{helicopter.nextDueHours.toFixed(1)} hrs</p>
            <p className="mt-2 text-sm text-ink-subtle">{helicopter.nextDueComponent}</p>
          </Panel>
          <Panel>
            <StatusPill tone={alerts.length > 0 ? "amber" : "green"}>Alerts</StatusPill>
            <p className="mt-4 text-2xl font-semibold text-ink">{alerts.length}</p>
            <p className="mt-2 text-sm text-ink-subtle">Open maintenance items for this aircraft.</p>
          </Panel>
        </section>

        <section className="mt-6 grid gap-4 xl:grid-cols-[0.78fr_1.22fr]">
          <Panel>
            <h2 className="text-lg font-semibold text-ink">Assignment</h2>
            <div className="mt-5 grid gap-3 text-sm">
              <div className="rounded-lg border border-line bg-canvas-muted/58 p-4">
                <p className="font-medium text-ink">{helicopter.assignedVessel ?? "Unassigned"}</p>
                <p className="mt-1 text-ink-subtle">{vessel ? `${vessel.owner} / ${vessel.capacityTons.toLocaleString()} tons` : "Ready for campaign planning"}</p>
              </div>
              <div className="rounded-lg border border-line bg-canvas-muted/58 p-4">
                <p className="font-medium text-ink">{helicopter.operationArea}</p>
                <p className="mt-1 text-ink-subtle">Base: {helicopter.base}</p>
              </div>
              <div className="rounded-lg border border-line bg-canvas-muted/58 p-4">
                <p className="font-medium text-ink">Notes</p>
                <p className="mt-1 leading-6 text-ink-subtle">{helicopter.notes}</p>
              </div>
            </div>
          </Panel>
          <Panel>
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-ink">Controlled Components</h2>
                <p className="mt-1 text-sm text-ink-subtle">Aircraft-specific component life tracking.</p>
              </div>
              <StatusPill tone="teal">{helicopterComponents.length} components</StatusPill>
            </div>
            <ComponentsTable components={helicopterComponents} compact />
          </Panel>
        </section>

        <section className="mt-6 grid gap-4 xl:grid-cols-[1fr_0.9fr]">
          <Panel>
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-ink">Maintenance Alerts</h2>
                <p className="mt-1 text-sm text-ink-subtle">Status-driving items tied to this aircraft.</p>
              </div>
              <StatusPill tone={alerts.length > 0 ? "amber" : "green"}>{alerts.length} active</StatusPill>
            </div>
            {alerts.length > 0 ? <AlertsList alerts={alerts} /> : <p className="text-sm text-ink-subtle">No open alerts for this aircraft.</p>}
          </Panel>
          <Panel>
            <h2 className="text-lg font-semibold text-ink">Replacement History</h2>
            <div className="mt-5 grid gap-3">
              {replacements.length > 0 ? (
                replacements.map((event) => (
                  <article key={event.id} className="rounded-lg border border-line bg-canvas-muted/58 p-4">
                    <p className="text-sm font-semibold text-ink">{event.installedComponent}</p>
                    <p className="mt-2 text-sm leading-6 text-ink-subtle">
                      Installed {event.installationDate} at {event.installationHourmeter.toFixed(1)} hours. {event.reason}.
                    </p>
                    <p className="mt-2 text-xs font-medium text-ink-subtle">Approved by {event.approvedBy}</p>
                  </article>
                ))
              ) : (
                <p className="text-sm text-ink-subtle">No replacement events in mock history.</p>
              )}
            </div>
          </Panel>
        </section>
      </div>
    </AppShell>
  );
}
