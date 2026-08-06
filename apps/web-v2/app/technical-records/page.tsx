import Link from "next/link";
import { FileText, Plus } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Panel } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status-pill";
import { SectionHeader } from "@/components/ui/section-header";
import { supabase } from "@/lib/supabase";
import { archiveTechnicalRecord } from "@/app/technical-records/actions";

export const dynamic = "force-dynamic";

type TechnicalRecordRow = {
  id: string;
  record_type: string;
  related_helicopter: string | null;
  title: string;
  record_date: string | null;
  document_number: string | null;
  notes: string | null;
  hourmeter: number | null;
  aircraft_hours: number | null;
  engine_hours: number | null;
  inspection_type: string | null;
  technician_name: string | null;
  created_at: string;
  campaigns: { id: string; code: string | null; name: string; vessels: { name: string } | null } | null;
};

function formatHours(value: number | null, label: string): string | null {
  return value != null ? `${label} ${Number(value).toFixed(1)}` : null;
}

const TYPE_TONE: Record<string, "green" | "amber" | "blue" | "teal" | "red" | "neutral"> = {
  "8130": "teal",
  "Logbook page": "blue",
  "Work order": "amber",
  Invoice: "neutral",
  Photo: "neutral",
  Certificate: "teal",
  "Release to service": "green",
  Inspection: "blue",
  Other: "neutral"
};

export default async function TechnicalRecordsPage() {
  const { data, error } = await supabase
    .from("technical_records")
    .select(
      "id, record_type, related_helicopter, title, record_date, document_number, notes, hourmeter, aircraft_hours, engine_hours, inspection_type, technician_name, created_at, campaigns:related_campaign_id(id, code, name, vessels:vessel_id(name))"
    )
    .eq("archived", false)
    .order("created_at", { ascending: false });

  const records = (data ?? []) as unknown as TechnicalRecordRow[];

  return (
    <AppShell>
      <div className="mx-auto max-w-[1500px]">
        <SectionHeader
          eyebrow="Mantenimiento"
          title="Registros Técnicos"
          description="Formularios 8130, hojas de logbook, órdenes de trabajo, facturas, certificados y release to service, más las inspecciones rutinarias y no rutinarias de cada faena (la bitácora digital que acompaña la de motor y fuselaje)."
          icon={FileText}
        />

        <Panel>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-ink">Registros</h2>
              <p className="mt-1 text-sm text-ink-subtle">{records.length} registro{records.length === 1 ? "" : "s"}</p>
            </div>
            <Link className="hsv-primary-button" href="/technical-records/new">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Agregar registro
            </Link>
          </div>

          {error ? <div className="hsv-error-banner">No se pudo conectar con la base de datos: {error.message}.</div> : null}

          <div className="hsv-table-wrap">
            <table className="hsv-table">
              <thead className="hsv-table-head">
                <tr>
                  <th className="hsv-table-th">Tipo</th>
                  <th className="hsv-table-th">Título</th>
                  <th className="hsv-table-th">Faena / Barco</th>
                  <th className="hsv-table-th">Técnico</th>
                  <th className="hsv-table-th">Helicóptero</th>
                  <th className="hsv-table-th">Fecha</th>
                  <th className="hsv-table-th">Notas</th>
                  <th className="hsv-table-th"></th>
                </tr>
              </thead>
              <tbody className="hsv-table-body">
                {records.map((record) => {
                  const boundArchive = archiveTechnicalRecord.bind(null, record.id);
                  const detailLine = [
                    record.inspection_type,
                    formatHours(record.hourmeter, "Horómetro"),
                    formatHours(record.aircraft_hours, "Hrs aeronave"),
                    formatHours(record.engine_hours, "Hrs motor")
                  ]
                    .filter(Boolean)
                    .join(" · ");
                  return (
                    <tr key={record.id} className="hsv-table-row align-top">
                      <td className="hsv-table-cell">
                        <StatusPill tone={TYPE_TONE[record.record_type] ?? "neutral"}>{record.record_type}</StatusPill>
                      </td>
                      <td className="hsv-table-cell">
                        <p className="font-semibold text-ink">{record.title}</p>
                        {record.document_number ? <p className="mt-0.5 text-xs text-ink-subtle">N° {record.document_number}</p> : null}
                        {detailLine ? <p className="mt-0.5 hsv-technical-value text-xs text-ink-subtle">{detailLine}</p> : null}
                      </td>
                      <td className="hsv-table-cell text-ink-muted">
                        {record.campaigns ? (
                          <>
                            <Link className="font-semibold text-ink hover:text-aviation-teal" href={`/campaigns/${record.campaigns.id}`}>
                              {record.campaigns.code || record.campaigns.name}
                            </Link>
                            {record.campaigns.vessels?.name ? <p className="mt-0.5 text-xs text-ink-subtle">{record.campaigns.vessels.name}</p> : null}
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="hsv-table-cell text-ink-muted">{record.technician_name || "—"}</td>
                      <td className="hsv-table-cell text-ink-muted">
                        {record.related_helicopter ? (
                          <Link className="hover:text-aviation-teal" href={`/helicopters/${record.related_helicopter}`}>
                            {record.related_helicopter}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="hsv-table-cell text-ink-muted">{record.record_date || "—"}</td>
                      <td className="hsv-table-cell text-ink-muted">{record.notes || "—"}</td>
                      <td className="hsv-table-cell">
                        <form action={boundArchive}>
                          <button className="hsv-secondary-button !px-2 !py-1 text-xs" type="submit">
                            Archivar
                          </button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
                {!records.length && !error ? (
                  <tr>
                    <td className="hsv-empty-state" colSpan={8}>
                      Todavía no hay registros técnicos.
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
