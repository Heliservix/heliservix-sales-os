import Link from "next/link";
import { FolderOpen, Plane, Plus, UploadCloud } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Panel } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status-pill";
import { SectionHeader } from "@/components/ui/section-header";
import { DonutChart, type DonutSlice } from "@/components/charts/donut-chart";
import { HelicopterBadge } from "@/components/aircraft/helicopter-badge";
import { supabase } from "@/lib/supabase";
import { fetchDocumentCenterData, computeSections, overallTone } from "@/lib/document-center";
import { getTechnicianScope } from "@/lib/technician-scope";

export const dynamic = "force-dynamic";

type HelicopterRow = {
  registration: string;
  model: string;
  current_hourmeter: number;
  status: string;
  assigned_vessel_id: string | null;
  photo_url: string | null;
  vessels: { name: string } | null;
};

type ComponentRemainingRow = {
  helicopter_registration: string;
  component_name: string;
  remaining_hours: number;
  remaining_calendar_days: number | null;
  status: string;
};

// Same 180-day threshold as the helicopter detail page's isCalendarDriven()
// — a component can look fine by hours but be quietly closer to its
// calendar deadline, which is the whole point of flagging it here too.
function isCalendarDriven(remainingCalendarDays: number | null) {
  return remainingCalendarDays != null && remainingCalendarDays <= 180;
}

const COMPONENT_STATUS_TONE: Record<string, DonutSlice["tone"]> = {
  OK: "green",
  Monitor: "amber",
  Critical: "red",
  Expired: "red"
};
const COMPONENT_STATUS_ORDER = ["OK", "Monitor", "Critical", "Expired"];

export default async function HelicoptersPage() {
  const { scopedRegistration } = await getTechnicianScope();

  const [{ data, error }, { data: componentStatusRows }, { data: componentRemainingRows }] = await Promise.all([
    (() => {
      let query = supabase
        .from("helicopters")
        .select("registration, model, current_hourmeter, status, assigned_vessel_id, photo_url, vessels(name)")
        .eq("archived", false);
      if (scopedRegistration) query = query.eq("registration", scopedRegistration);
      return query.order("registration");
    })(),
    (() => {
      let query = supabase.from("components").select("status").neq("status", "Removed");
      if (scopedRegistration) query = query.eq("helicopter_registration", scopedRegistration);
      return query;
    })(),
    (() => {
      let query = supabase
        .from("components")
        .select("helicopter_registration, component_name, remaining_hours, remaining_calendar_days, status")
        .neq("status", "Removed");
      if (scopedRegistration) query = query.eq("helicopter_registration", scopedRegistration);
      return query;
    })()
  ]);

  const helicopters = (data ?? []) as unknown as HelicopterRow[];
  const registrations = helicopters.map((h) => h.registration);
  const documentCenterData = registrations.length
    ? await fetchDocumentCenterData(registrations)
    : {
        policies: [],
        payments: [],
        workOrders: [],
        components: [],
        complianceItems: [],
        nonRoutineReports: [],
        maintenanceLogs: [],
        componentChanges: [],
        campaigns: [],
        documents: [],
        eltByRegistration: new Map()
      };
  const documentCenterToneByRegistration = new Map(
    registrations.map((registration) => [registration, overallTone(computeSections(registration, documentCenterData))])
  );
  const toneDot: Record<string, string> = {
    green: "bg-aviation-green",
    amber: "bg-aviation-amber",
    red: "bg-aviation-red",
    neutral: "bg-ink-subtle"
  };

  const componentStatusCounts = new Map<string, number>();
  for (const row of componentStatusRows ?? []) {
    componentStatusCounts.set(row.status, (componentStatusCounts.get(row.status) ?? 0) + 1);
  }
  const componentStatusSlices: DonutSlice[] = COMPONENT_STATUS_ORDER.filter((status) => componentStatusCounts.has(status)).map((status) => ({
    label: status,
    value: componentStatusCounts.get(status) ?? 0,
    tone: COMPONENT_STATUS_TONE[status] ?? "neutral"
  }));

  // The single most limiting component per aircraft — the one that will need
  // a replacement/overhaul kit soonest. This is what "cuándo debo comprar un
  // kit" actually depends on: not the average, the bottleneck.
  const limitingComponentByHelicopter = new Map<string, ComponentRemainingRow>();
  for (const row of (componentRemainingRows ?? []) as ComponentRemainingRow[]) {
    const current = limitingComponentByHelicopter.get(row.helicopter_registration);
    if (!current || Number(row.remaining_hours) < Number(current.remaining_hours)) {
      limitingComponentByHelicopter.set(row.helicopter_registration, row);
    }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-[1500px]">
        <SectionHeader
          eyebrow="Flota"
          title={scopedRegistration ? `Helicóptero — ${scopedRegistration}` : "Helicópteros"}
          description={
            scopedRegistration
              ? "Solo ves tu helicóptero asignado. Si no es el correcto, pídele a Adolfo que lo corrija en Personal."
              : "Matrícula, modelo, horómetro y estado — datos reales de Supabase, no de un archivo en tu navegador."
          }
          icon={Plane}
        />

        {componentStatusSlices.length ? (
          <Panel className="mb-5">
            <p className="text-xs font-semibold uppercase text-ink-subtle">
              Estado de componentes — {scopedRegistration ? scopedRegistration : "toda la flota"}
            </p>
            <div className="mt-3">
              <DonutChart slices={componentStatusSlices} size={112} centerLabel="componentes" />
            </div>
          </Panel>
        ) : null}

        <Panel>
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-ink">Helicópteros</h2>
              <p className="mt-1 text-sm text-ink-subtle">{helicopters.length} registro{helicopters.length === 1 ? "" : "s"}</p>
            </div>
            {!scopedRegistration ? (
              <div className="flex flex-wrap gap-3">
                <Link className="hsv-secondary-button" href="/helicopters/import">
                  <UploadCloud className="h-4 w-4" aria-hidden="true" />
                  Importar componentes
                </Link>
                <Link className="hsv-primary-button" href="/helicopters/new">
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Crear helicóptero
                </Link>
              </div>
            ) : null}
          </div>

          {error ? (
            <div className="hsv-error-banner">
              No se pudo conectar con la base de datos: {error.message}. Verifica que corriste{" "}
              <code className="hsv-technical-value">infra/database/schema.sql</code> en el SQL Editor de Supabase.
            </div>
          ) : null}

          <div className="hsv-table-wrap">
            <table className="hsv-table">
              <thead className="hsv-table-head">
                <tr>
                  <th className="hsv-table-th">Matrícula</th>
                  <th className="hsv-table-th">Modelo</th>
                  <th className="hsv-table-th">Horómetro</th>
                  <th className="hsv-table-th">Horas remanentes</th>
                  <th className="hsv-table-th">Estado</th>
                  <th className="hsv-table-th">Barco asignado</th>
                  <th className="hsv-table-th">Centro Documental</th>
                </tr>
              </thead>
              <tbody className="hsv-table-body">
                {helicopters.map((helicopter) => (
                  <tr key={helicopter.registration} className="hsv-table-row">
                    <td className="hsv-table-cell">
                      <Link className="inline-flex items-center hover:text-aviation-teal" href={`/helicopters/${helicopter.registration}`}>
                        <HelicopterBadge registration={helicopter.registration} photoUrl={helicopter.photo_url} size="sm" />
                      </Link>
                    </td>
                    <td className="hsv-table-cell text-ink-muted">{helicopter.model}</td>
                    <td className="hsv-table-cell hsv-technical-value">{Number(helicopter.current_hourmeter).toFixed(1)}</td>
                    <td className="hsv-table-cell">
                      {(() => {
                        const limiting = limitingComponentByHelicopter.get(helicopter.registration);
                        if (!limiting) return <span className="text-ink-muted">—</span>;
                        const tone =
                          limiting.status === "Expired" || limiting.status === "Critical"
                            ? "text-status-red"
                            : limiting.status === "Monitor"
                              ? "text-amber-600"
                              : "text-ink-muted";
                        const calendarDriven = isCalendarDriven(limiting.remaining_calendar_days);
                        return (
                          <div>
                            <span className={`hsv-technical-value font-semibold ${tone}`}>
                              {Number(limiting.remaining_hours).toFixed(1)} hrs
                            </span>
                            <p className="mt-0.5 text-xs text-ink-subtle">
                              {limiting.component_name}
                              {calendarDriven ? (
                                <span className="ml-1 font-semibold text-aviation-amber">· vence por calendario</span>
                              ) : (
                                " · por horas"
                              )}
                            </p>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="hsv-table-cell">
                      <StatusPill tone={helicopter.status === "Grounded" ? "red" : helicopter.status === "Maintenance" ? "amber" : "teal"}>
                        {helicopter.status}
                      </StatusPill>
                    </td>
                    <td className="hsv-table-cell text-ink-muted">{helicopter.vessels?.name ?? "Sin asignar"}</td>
                    <td className="hsv-table-cell">
                      {(() => {
                        const tone = documentCenterToneByRegistration.get(helicopter.registration) ?? "neutral";
                        return (
                          <Link
                            href={`/helicopters/${helicopter.registration}`}
                            className="inline-flex items-center gap-1.5 hover:text-aviation-teal"
                          >
                            <FolderOpen className="h-3.5 w-3.5 text-ink-subtle" aria-hidden="true" />
                            <span className={`h-2.5 w-2.5 rounded-full ${toneDot[tone]}`} aria-hidden="true" />
                            <span className="text-xs text-ink-muted">
                              {tone === "green" ? "Todo vigente" : tone === "amber" ? "Revisar" : tone === "red" ? "Atención" : "Sin datos"}
                            </span>
                          </Link>
                        );
                      })()}
                    </td>
                  </tr>
                ))}
                {!helicopters.length && !error ? (
                  <tr>
                    <td className="hsv-empty-state" colSpan={7}>
                      Todavía no hay helicópteros. Crea el primero con el botón de arriba.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
