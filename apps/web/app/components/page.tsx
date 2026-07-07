import { AppShell } from "@/components/layout/app-shell";
import { ComponentsTable } from "@/components/fleet/components-table";
import { PageHeader } from "@/components/fleet/page-header";
import { Panel } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status-pill";
import { componentCategories, components } from "@/lib/fleet-data";
import { Wrench } from "lucide-react";

export default function ComponentsPage() {
  const statusCounts = ["OK", "Monitor", "Critical", "Expired"].map((status) => ({
    status,
    count: components.filter((component) => component.status === status).length
  }));

  return (
    <AppShell>
      <div className="mx-auto max-w-[1500px]">
        <PageHeader
          eyebrow="Component Control"
          title="Life-limited components by helicopter, hourmeter, and calendar exposure."
          description="Track part numbers, serial numbers, installation dates, TSN, TSO, life limits, remaining hours, calendar limits, status, notes, and attached documents."
          icon={Wrench}
          status={`${components.length} controlled components`}
        />

        <section className="grid gap-4 md:grid-cols-4">
          {statusCounts.map((item) => (
            <Panel key={item.status}>
              <StatusPill tone={item.status === "OK" ? "green" : item.status === "Monitor" ? "amber" : "red"}>{item.status}</StatusPill>
              <p className="mt-4 text-3xl font-semibold text-ink">{item.count}</p>
              <p className="mt-2 text-sm text-ink-subtle">Current component status records.</p>
            </Panel>
          ))}
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-[0.75fr_1.25fr]">
          <Panel>
            <h2 className="text-lg font-semibold text-ink">Categories</h2>
            <div className="mt-5 grid gap-3">
              {componentCategories.map((category) => (
                <article key={category.id} className="rounded-lg border border-line bg-canvas-muted/58 p-4">
                  <p className="text-sm font-semibold text-ink">{category.name}</p>
                  <p className="mt-2 text-sm leading-6 text-ink-subtle">{category.description}</p>
                </article>
              ))}
            </div>
          </Panel>

          <Panel>
            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-ink">Components Table</h2>
                <p className="mt-1 text-sm text-ink-subtle">Workbook-inspired data model prepared for import mapping.</p>
              </div>
              <StatusPill tone="teal">Excel-ready fields</StatusPill>
            </div>
            <ComponentsTable components={components} />
          </Panel>
        </section>
      </div>
    </AppShell>
  );
}
