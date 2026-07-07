import { Anchor } from "lucide-react";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/fleet/page-header";
import { Panel } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status-pill";
import { getVessel } from "@/lib/fleet-data";

type VesselDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function VesselDetailPage({ params }: VesselDetailPageProps) {
  const { id } = await params;
  const vessel = getVessel(id);

  if (!vessel) {
    notFound();
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-[1200px]">
        <PageHeader
          eyebrow="Vessel Detail"
          title={vessel.name}
          description={`${vessel.owner} / ${vessel.country}. This is a neutral demo record for interface validation only.`}
          icon={Anchor}
          status={vessel.status}
        />

        <section className="grid gap-4 md:grid-cols-4">
          <Panel>
            <StatusPill tone="teal">Home Port</StatusPill>
            <p className="mt-4 text-xl font-semibold text-ink">{vessel.homePort}</p>
          </Panel>
          <Panel>
            <StatusPill tone="blue">Capacity</StatusPill>
            <p className="mt-4 text-xl font-semibold text-ink">{vessel.capacityTons.toLocaleString()} tons</p>
          </Panel>
          <Panel>
            <StatusPill tone="amber">Campaign</StatusPill>
            <p className="mt-4 text-xl font-semibold text-ink">{vessel.campaign}</p>
          </Panel>
          <Panel>
            <StatusPill tone="neutral">Assigned Helicopter</StatusPill>
            <p className="mt-4 text-xl font-semibold text-ink">{vessel.assignedHelicopter ?? "Unassigned"}</p>
          </Panel>
        </section>

        <Panel className="mt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-ink">Vessel Record</h2>
              <p className="mt-1 text-sm text-ink-subtle">{vessel.notes}</p>
            </div>
            <a className="inline-flex h-10 items-center justify-center rounded-md border border-line bg-white px-4 text-sm font-semibold text-ink shadow-control transition hover:bg-canvas-muted dark:bg-canvas-muted" href={`/vessels/${vessel.id}/edit`}>
              Edit vessel
            </a>
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
