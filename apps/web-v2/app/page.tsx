import Link from "next/link";
import { Gauge, Plane } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Panel } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status-pill";
import { BrandLockup } from "@/components/brand/brand-lockup";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [{ count: helicopterCount }, { count: openAlertCount }, { data: criticalAlerts }] = await Promise.all([
    supabase.from("helicopters").select("*", { count: "exact", head: true }).eq("archived", false),
    supabase.from("maintenance_alerts").select("*", { count: "exact", head: true }).neq("status", "Resolved"),
    supabase
      .from("maintenance_alerts")
      .select("id, helicopter_registration, component_name, severity, description")
      .in("severity", ["Critical", "Grounding"])
      .neq("status", "Resolved")
      .limit(5)
  ]);

  return (
    <AppShell>
      <div className="mx-auto max-w-[1500px]">
        <div className="grid gap-6">
          <Panel className="overflow-hidden bg-white">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="mb-4 w-fit">
                  <BrandLockup variant="compact" />
                </div>
                <h2 className="mt-3 text-3xl font-semibold tracking-normal text-ink sm:text-4xl">Centro de Operaciones</h2>
                <p className="mt-3 max-w-3xl text-base leading-7 text-ink-muted">
                  Conectado en vivo a la base de datos real de HeliServiX OS. Este número no puede duplicarse: viene directo de Supabase.
                </p>
              </div>
              <div className="rounded-xl border border-line bg-canvas-muted/55 p-4">
                <StatusPill tone={openAlertCount ? "amber" : "green"}>{openAlertCount ? "Atención requerida" : "Operacional"}</StatusPill>
                <p className="mt-3 text-sm leading-6 text-ink-subtle">Panamá · Ecuador</p>
              </div>
            </div>
          </Panel>

          <section className="grid gap-4 sm:grid-cols-2">
            <Panel>
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-line bg-canvas-muted text-ink">
                  <Plane className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm text-ink-muted">Helicópteros activos</p>
                  <p className="text-2xl font-semibold text-ink">{helicopterCount ?? 0}</p>
                </div>
              </div>
            </Panel>
            <Panel>
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-line bg-canvas-muted text-ink">
                  <Gauge className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm text-ink-muted">Alertas de mantenimiento abiertas</p>
                  <p className="text-2xl font-semibold text-ink">{openAlertCount ?? 0}</p>
                </div>
              </div>
            </Panel>
          </section>

          <Panel>
            <h3 className="text-base font-semibold text-ink">Alertas críticas</h3>
            <div className="mt-4 grid gap-3">
              {(criticalAlerts ?? []).map((alert) => (
                <div key={alert.id} className="rounded-xl border border-aviation-red/20 bg-aviation-red/5 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill tone="red">{alert.severity}</StatusPill>
                    <StatusPill tone="neutral">{alert.helicopter_registration}</StatusPill>
                  </div>
                  <p className="mt-3 text-sm font-semibold text-ink">{alert.component_name}</p>
                  <p className="mt-1 text-sm leading-6 text-ink-subtle">{alert.description}</p>
                </div>
              ))}
              {!criticalAlerts?.length ? <p className="hsv-empty-state">Sin alertas críticas abiertas.</p> : null}
            </div>
          </Panel>

          <Panel>
            <h3 className="text-base font-semibold text-ink">Siguiente paso</h3>
            <p className="mt-2 text-sm leading-6 text-ink-subtle">
              Esta es la primera vista real del rediseño. Solo Flota está migrada a la base de datos por ahora.
            </p>
            <Link className="hsv-primary-button mt-4 inline-flex" href="/helicopters">
              Ver flota
            </Link>
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
