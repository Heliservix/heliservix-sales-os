import { AppShell } from "@/components/layout/app-shell";
import { HelicopterCard } from "@/components/fleet/helicopter-card";
import { HelicoptersTable } from "@/components/fleet/helicopters-table";
import { PageHeader } from "@/components/fleet/page-header";
import { Panel } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status-pill";
import { components, helicopters } from "@/lib/fleet-data";
import { Plane } from "lucide-react";

export default function HelicoptersPage() {
  const grounded = helicopters.filter((helicopter) => helicopter.status === "Grounded").length;
  const assigned = helicopters.filter((helicopter) => helicopter.assignedVessel && helicopter.assignedVessel !== "Unassigned").length;

  return (
    <AppShell>
      <div className="mx-auto max-w-[1500px]">
        <PageHeader
          eyebrow="Helicopter Registry"
          title="Aircraft readiness across the tuna-vessel operating fleet."
          description="Registry, ownership, assigned vessels, current hourmeters, operational geography, and next limiting component for each helicopter."
          icon={Plane}
          status={`${helicopters.length} helicopters tracked`}
        />

        <section className="grid gap-4 md:grid-cols-3">
          <Panel>
            <StatusPill tone="teal">Registry</StatusPill>
            <p className="mt-4 text-3xl font-semibold text-ink">{helicopters.length}</p>
            <p className="mt-2 text-sm text-ink-subtle">HP1804, HP1782, HP1783, HP1768, HP1769, and future aircraft.</p>
          </Panel>
          <Panel>
            <StatusPill tone="green">Assigned</StatusPill>
            <p className="mt-4 text-3xl font-semibold text-ink">{assigned}</p>
            <p className="mt-2 text-sm text-ink-subtle">Linked to active or proposed tuna-vessel campaigns.</p>
          </Panel>
          <Panel>
            <StatusPill tone={grounded > 0 ? "red" : "green"}>Grounding Exposure</StatusPill>
            <p className="mt-4 text-3xl font-semibold text-ink">{grounded}</p>
            <p className="mt-2 text-sm text-ink-subtle">{components.filter((component) => component.status === "Expired").length} expired controlled component.</p>
          </Panel>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
          {helicopters.map((helicopter) => (
            <HelicopterCard key={helicopter.registration} helicopter={helicopter} />
          ))}
        </section>

        <Panel className="mt-6">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-ink">Fleet Registry</h2>
              <p className="mt-1 text-sm text-ink-subtle">Current production-shaped fields for MVP aircraft records.</p>
            </div>
            <StatusPill tone="teal">Mock source</StatusPill>
          </div>
          <HelicoptersTable helicopters={helicopters} />
        </Panel>
      </div>
    </AppShell>
  );
}
