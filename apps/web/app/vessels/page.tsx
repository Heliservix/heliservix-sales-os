import { Anchor, Plus } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/fleet/page-header";
import { VesselsTable } from "@/components/fleet/vessels-table";
import { Panel } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status-pill";
import { protectedDemoRegistrations, vessels } from "@/lib/fleet-data";
import Link from "next/link";

export default function VesselsPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-[1500px]">
        <PageHeader
          eyebrow="Vessel Management"
          title="Manage tuna-vessel records and helicopter assignment readiness."
          description="Create, review, and edit vessel records with owner, country, home port, capacity, campaign, assigned helicopter, status, and notes."
          icon={Anchor}
          status={`${vessels.length} neutral demo vessels`}
        />

        <section className="grid gap-4 md:grid-cols-3">
          <Panel>
            <StatusPill tone="amber">Demo Records</StatusPill>
            <p className="mt-4 text-3xl font-semibold text-ink">{vessels.length}</p>
            <p className="mt-2 text-sm text-ink-subtle">Neutral labels only. No invented vessel names are presented as real.</p>
          </Panel>
          <Panel>
            <StatusPill tone="teal">Assignment Workflow</StatusPill>
            <p className="mt-4 text-3xl font-semibold text-ink">1</p>
            <p className="mt-2 text-sm text-ink-subtle">Demo helicopter assignment visible for UI validation.</p>
          </Panel>
          <Panel>
            <StatusPill tone="red">Protected Fleet Data</StatusPill>
            <p className="mt-4 text-lg font-semibold text-ink">{protectedDemoRegistrations.join(", ")}</p>
            <p className="mt-2 text-sm text-ink-subtle">These registrations must not use invented details or assignments.</p>
          </Panel>
        </section>

        <Panel className="mt-6">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-ink">Vessels List</h2>
              <p className="mt-1 text-sm text-ink-subtle">Frontend-only vessel management surface prepared for real data entry.</p>
            </div>
            <Link className="inline-flex h-10 items-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-white shadow-control transition hover:opacity-92 dark:bg-white dark:text-ink" href="/vessels/new">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add vessel
            </Link>
          </div>
          <VesselsTable vessels={vessels} />
        </Panel>
      </div>
    </AppShell>
  );
}
