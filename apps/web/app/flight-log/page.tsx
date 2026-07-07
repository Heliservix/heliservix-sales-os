import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/fleet/page-header";
import { Panel } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status-pill";
import { flightLogs, helicopters, vessels } from "@/lib/fleet-data";
import { ClipboardList, Plus } from "lucide-react";

export default function FlightLogPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-[1300px]">
        <PageHeader
          eyebrow="Flight Hour Logging"
          title="Capture Hobbs movement by helicopter, vessel, and campaign."
          description="Frontend MVP screen for the flight-log workflow that will later update aircraft hourmeters, component remaining hours, and maintenance alerts."
          icon={ClipboardList}
          status="Mock form only"
        />

        <section className="grid gap-4 xl:grid-cols-[0.88fr_1.12fr]">
          <Panel>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-ink">New Flight Log</h2>
                <p className="mt-1 text-sm text-ink-subtle">Structured fields prepared for backend calculation.</p>
              </div>
              <a className="inline-flex h-10 items-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-white shadow-control transition hover:opacity-92 dark:bg-white dark:text-ink" href="/flight-log/new">
                <Plus className="h-4 w-4" aria-hidden="true" />
                Open create screen
              </a>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-ink">
                Helicopter
                <select className="h-11 rounded-md border border-line bg-white px-3 text-sm text-ink shadow-control outline-none dark:bg-canvas-muted" defaultValue="HP1804">
                  {helicopters.map((helicopter) => (
                    <option key={helicopter.registration}>{helicopter.registration}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm font-medium text-ink">
                Vessel / Campaign
                <select className="h-11 rounded-md border border-line bg-white px-3 text-sm text-ink shadow-control outline-none dark:bg-canvas-muted" defaultValue="Demo Vessel A">
                  {vessels.map((vessel) => (
                    <option key={vessel.id}>{vessel.name}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm font-medium text-ink">
                Flight Date
                <input className="h-11 rounded-md border border-line bg-white px-3 text-sm text-ink shadow-control outline-none dark:bg-canvas-muted" defaultValue="2026-07-07" type="date" />
              </label>
              <label className="grid gap-2 text-sm font-medium text-ink">
                Pilot
                <input className="h-11 rounded-md border border-line bg-white px-3 text-sm text-ink shadow-control outline-none dark:bg-canvas-muted" defaultValue="Adolfo Spinali" />
              </label>
              <label className="grid gap-2 text-sm font-medium text-ink">
                Mechanic
                <input className="h-11 rounded-md border border-line bg-white px-3 text-sm text-ink shadow-control outline-none dark:bg-canvas-muted" defaultValue="Carlos Rivas" />
              </label>
              <label className="grid gap-2 text-sm font-medium text-ink">
                Hobbs Start
                <input className="h-11 rounded-md border border-line bg-white px-3 text-sm text-ink shadow-control outline-none dark:bg-canvas-muted" defaultValue="1820.4" inputMode="decimal" />
              </label>
              <label className="grid gap-2 text-sm font-medium text-ink">
                Hobbs End
                <input className="h-11 rounded-md border border-line bg-white px-3 text-sm text-ink shadow-control outline-none dark:bg-canvas-muted" defaultValue="1823.8" inputMode="decimal" />
              </label>
              <div className="rounded-lg border border-line bg-canvas-muted/58 p-4">
                <p className="text-xs font-semibold uppercase text-ink-subtle">Calculated Flight Hours</p>
                <p className="mt-2 text-2xl font-semibold text-ink">3.4</p>
              </div>
              <label className="grid gap-2 text-sm font-medium text-ink sm:col-span-2">
                Notes
                <textarea className="min-h-28 rounded-md border border-line bg-white px-3 py-3 text-sm text-ink shadow-control outline-none dark:bg-canvas-muted" defaultValue="Search support and vessel positioning sortie for Eastern Pacific campaign readiness." />
              </label>
            </div>
          </Panel>

          <Panel>
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-ink">Recent Flight Logs</h2>
                <p className="mt-1 text-sm text-ink-subtle">Mock records showing approval and hour impact structure.</p>
              </div>
              <StatusPill tone="blue">{flightLogs.length} entries</StatusPill>
            </div>
            <div className="grid gap-3">
              {flightLogs.map((log) => (
                <article key={log.id} className="rounded-lg border border-line bg-canvas-muted/58 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusPill tone="teal">{log.helicopterRegistration}</StatusPill>
                        <StatusPill tone={log.approvalStatus === "Approved" ? "green" : "amber"}>{log.approvalStatus}</StatusPill>
                      </div>
                      <h3 className="mt-3 text-sm font-semibold text-ink">{log.vesselName} / {log.campaign}</h3>
                      <p className="mt-2 text-sm leading-6 text-ink-subtle">{log.notes}</p>
                    </div>
                    <div className="rounded-md border border-line bg-white/70 p-3 text-sm dark:bg-canvas-muted">
                      <p className="font-semibold text-ink">{log.flightHours.toFixed(1)} hrs</p>
                      <p className="mt-1 text-xs text-ink-subtle">{log.hobbsStart.toFixed(1)} to {log.hobbsEnd.toFixed(1)}</p>
                      <p className="mt-1 text-xs text-ink-subtle">{log.flightDate}</p>
                      <a className="mt-2 inline-block text-xs font-semibold text-aviation-teal hover:text-ink" href={`/flight-log/${log.id}/edit`}>
                        Edit log
                      </a>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </Panel>
        </section>
      </div>
    </AppShell>
  );
}
