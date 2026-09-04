import Link from "next/link";
import { Plus, AlertOctagon } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Panel } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status-pill";
import { SectionHeader } from "@/components/ui/section-header";
import { supabase } from "@/lib/supabase";
import { openNonRoutineStatuses } from "@/app/non-routine/constants";
import { getTechnicianScope } from "@/lib/technician-scope";

export const dynamic = "force-dynamic";

type ReportRow = {
  id: string;
  sequence_number: number;
  helicopter_registration: string | null;
  aircraft_model: string | null;
  discrepancy: string;
  status: string;
  report_date: string;
  opened_by_personnel_id: string | null;
};

const STATUS_TONE: Record<string, "green" | "amber" | "blue" | "teal" | "red" | "neutral"> = {
  Abierta: "amber",
  Corregida: "blue",
  Cerrada: "green"
};

export default async function NonRoutinePage() {
  const { scopedRegistration } = await getTechnicianScope();

  const [{ data, error }, { data: personnelData }] = await Promise.all([
    (() => {
      let query = supabase
        .from("non_routine_reports")
        .select("id, sequence_number, helicopter_registration, aircraft_model, discrepancy, status, report_date, opened_by_personnel_id")
        .eq("archived", false);
      if (scopedRegistration) query = query.eq("helicopter_registration", scopedRegistration);
      return query.order("created_at", { ascending: false });
    })(),
    supabase.from("personnel").select("id, full_name")
  ]);

  const reports = (data ?? []) as ReportRow[];
  const personnelById = new Map((personnelData ?? []).map((p) => [p.id, p.full_name]));

  const openCount = reports.filter((r) => (openNonRoutineStatuses as readonly string[]).includes(r.status)).length;

  return (
    <AppShell>
      <div className="mx-auto max-w-[1400px]">
        <SectionHeader
          eyebrow="Mantenimiento"
          title="Reportes No Rutina"
          description='Formulario AS-09 digitalizado — registra una discrepancia encontrada, su acción correctiva, y el inspector que la cierra. Queda registrado quién encontró, quién corrigió y quién cerró cada hallazgo.'
          icon={AlertOctagon}
        />

        <div className="mb-5 grid gap-4 sm:grid-cols-3">
          <Panel>
            <p className="text-xs font-semibold uppercase text-ink-subtle">Reportes abiertos</p>
            <p className="mt-1 text-2xl font-bold text-ink">{openCount}</p>
          </Panel>
          <Panel>
            <p className="text-xs font-semibold uppercase text-ink-subtle">Total registrados</p>
            <p className="mt-1 text-2xl font-bold text-ink">{reports.length}</p>
          </Panel>
          <Panel>
            <p className="text-xs font-semibold uppercase text-ink-subtle">Cerrados</p>
            <p className="mt-1 text-2xl font-bold text-ink">{reports.filter((r) => r.status === "Cerrada").length}</p>
          </Panel>
        </div>

        <Panel>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <AlertOctagon className="h-5 w-5 text-ink-muted" aria-hidden="true" />
              <h2 className="text-lg font-semibold text-ink">Reportes</h2>
            </div>
            <Link className="hsv-primary-button" href="/non-routine/new">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Crear Reporte No Rutina
            </Link>
          </div>

          {error ? <div className="hsv-error-banner">No se pudo conectar con la base de datos: {error.message}.</div> : null}

          <div className="hsv-table-wrap">
            <table className="hsv-table">
              <thead className="hsv-table-head">
                <tr>
                  <th className="hsv-table-th">N° Reporte</th>
                  <th className="hsv-table-th">Aeronave</th>
                  <th className="hsv-table-th">Discrepancia</th>
                  <th className="hsv-table-th">Encontrado por</th>
                  <th className="hsv-table-th">Fecha</th>
                  <th className="hsv-table-th">Estado</th>
                </tr>
              </thead>
              <tbody className="hsv-table-body">
                {reports.map((report) => (
                  <tr key={report.id} className="hsv-table-row">
                    <td className="hsv-table-cell hsv-technical-value">
                      <Link className="font-semibold text-ink hover:text-aviation-teal" href={`/non-routine/${report.id}`}>
                        NR-{String(report.sequence_number).padStart(5, "0")}
                      </Link>
                    </td>
                    <td className="hsv-table-cell text-ink-muted">
                      {report.helicopter_registration ? (
                        <Link className="hover:text-aviation-teal" href={`/helicopters/${report.helicopter_registration}`}>
                          {report.helicopter_registration}
                        </Link>
                      ) : (
                        report.aircraft_model || "—"
                      )}
                    </td>
                    <td className="hsv-table-cell max-w-md truncate text-ink-muted">{report.discrepancy}</td>
                    <td className="hsv-table-cell text-ink-muted">
                      {report.opened_by_personnel_id ? personnelById.get(report.opened_by_personnel_id) ?? "—" : "—"}
                    </td>
                    <td className="hsv-table-cell text-ink-muted">{report.report_date}</td>
                    <td className="hsv-table-cell">
                      <StatusPill tone={STATUS_TONE[report.status] ?? "neutral"}>{report.status}</StatusPill>
                    </td>
                  </tr>
                ))}
                {!reports.length && !error ? (
                  <tr>
                    <td className="hsv-empty-state" colSpan={6}>
                      Todavía no hay reportes de no rutina — crea el primero arriba.
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
