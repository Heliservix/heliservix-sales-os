import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, FileText, Radio, Wrench } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Panel } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status-pill";
import { SectionHeader } from "@/components/ui/section-header";
import { supabase } from "@/lib/supabase";
import { fetchDocumentCenterData, type AircraftDocumentRow } from "@/lib/document-center";
import { DocumentUploadForm } from "@/app/helicopters/[registration]/documents/document-upload-form";
import { EltForm } from "@/app/helicopters/[registration]/documents/elt-form";
import { archiveAircraftDocument } from "@/app/helicopters/[registration]/documents/actions";

export const dynamic = "force-dynamic";

type DocumentsPageProps = {
  params: Promise<{ registration: string }>;
};

function DocumentList({ registration, docs }: { registration: string; docs: AircraftDocumentRow[] }) {
  if (!docs.length) return <p className="text-sm text-ink-subtle">Sin documentos cargados todavía.</p>;
  return (
    <div className="hsv-table-wrap">
      <table className="hsv-table">
        <thead className="hsv-table-head">
          <tr>
            <th className="hsv-table-th">Título</th>
            <th className="hsv-table-th">Vencimiento</th>
            <th className="hsv-table-th">Archivo</th>
            <th className="hsv-table-th"></th>
          </tr>
        </thead>
        <tbody className="hsv-table-body">
          {docs.map((doc) => {
            const boundArchive = archiveAircraftDocument.bind(null, registration, doc.id);
            return (
              <tr key={doc.id} className="hsv-table-row">
                <td className="hsv-table-cell">
                  <p className="font-semibold text-ink">{doc.title}</p>
                  {doc.document_number ? <p className="text-xs text-ink-subtle">N° {doc.document_number}</p> : null}
                  {doc.vendor || doc.amount != null ? (
                    <p className="text-xs text-ink-subtle">
                      {doc.vendor ?? ""} {doc.amount != null ? `— $${Number(doc.amount).toLocaleString("en-US")} ${doc.currency}` : ""}
                    </p>
                  ) : null}
                </td>
                <td className="hsv-table-cell text-ink-muted">{doc.expiry_date ?? "—"}</td>
                <td className="hsv-table-cell">
                  {doc.file_url ? (
                    <a href={doc.file_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-aviation-teal hover:underline">
                      Ver <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                    </a>
                  ) : (
                    <span className="text-ink-subtle">Sin archivo</span>
                  )}
                </td>
                <td className="hsv-table-cell">
                  <form action={boundArchive}>
                    <button className="hsv-danger-button !px-2 !py-1 text-xs" type="submit">
                      Archivar
                    </button>
                  </form>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default async function AircraftDocumentsPage({ params }: DocumentsPageProps) {
  const { registration } = await params;
  const { data: helicopter } = await supabase.from("helicopters").select("registration, model").eq("registration", registration).maybeSingle();
  if (!helicopter) notFound();

  const data = await fetchDocumentCenterData([registration]);
  const certificados = data.documents.filter((d) => d.helicopter_registration === registration && d.category === "Certificados");
  const bitacoras = data.documents.filter((d) => d.helicopter_registration === registration && d.category === "Bitacoras");
  const facturas = data.documents.filter((d) => d.helicopter_registration === registration && d.category === "Facturas");
  const componentChanges = data.componentChanges.filter((c) => c.helicopter_registration === registration);
  const elt = data.eltByRegistration.get(registration) ?? null;

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl">
        <Link href={`/helicopters/${registration}`} className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-aviation-teal hover:underline">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Volver a {registration}
        </Link>
        <SectionHeader
          eyebrow="Centro Documental"
          title={`Documentos — ${registration}`}
          description={`${helicopter.model} — certificados, bitácoras, facturas y estado del ELT. Todo lo que subas aquí queda disponible para cualquier técnico, incluso si el encargado habitual no está.`}
          icon={FileText}
        />

        <Panel className="mb-5">
          <h2 className="mb-1 text-lg font-semibold text-ink">01 · Certificados y documentos de aeronave</h2>
          <p className="mb-4 text-xs text-ink-subtle">
            Certificado de Aeronavegabilidad, Certificado de Matrícula, licencia de radio, certificado de ruido, y cualquier otro documento
            oficial de la aeronave.
          </p>
          <DocumentList registration={registration} docs={certificados} />
          <div className="mt-4 border-t border-line pt-4">
            <DocumentUploadForm registration={registration} category="Certificados" />
          </div>
        </Panel>

        <Panel className="mb-5">
          <h2 className="mb-1 text-lg font-semibold text-ink">07 · Bitácoras</h2>
          <p className="mb-4 text-xs text-ink-subtle">Páginas escaneadas del logbook de aeronave y de motor.</p>
          <DocumentList registration={registration} docs={bitacoras} />
          <div className="mt-4 border-t border-line pt-4">
            <DocumentUploadForm registration={registration} category="Bitacoras" />
          </div>
        </Panel>

        <Panel className="mb-5">
          <h2 className="mb-1 text-lg font-semibold text-ink">10 · Facturas relacionadas</h2>
          <p className="mb-4 text-xs text-ink-subtle">Facturas de repuestos, servicios o mantenimiento de esta aeronave.</p>
          <DocumentList registration={registration} docs={facturas} />
          <div className="mt-4 border-t border-line pt-4">
            <DocumentUploadForm registration={registration} category="Facturas" showAmount />
          </div>
        </Panel>

        <Panel className="mb-5">
          <div className="mb-1 flex items-center gap-2">
            <Radio className="h-4 w-4 text-aviation-blue" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-ink">12 · ELT Status</h2>
            <StatusPill tone={!elt ? "red" : "green"}>{!elt ? "Sin registro" : "Registrado"}</StatusPill>
          </div>
          <p className="mb-4 text-xs text-ink-subtle">Transmisor localizador de emergencia — vencimiento de batería e inspecciones.</p>
          <EltForm registration={registration} elt={elt} />
        </Panel>

        <Panel>
          <div className="mb-1 flex items-center gap-2">
            <Wrench className="h-4 w-4 text-aviation-blue" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-ink">09 · Repuestos instalados</h2>
          </div>
          <p className="mb-4 text-xs text-ink-subtle">
            Historial de cambios de componente registrados en mantenimiento en hangar y reportes No Rutina de esta aeronave.
          </p>
          {componentChanges.length ? (
            <div className="hsv-table-wrap">
              <table className="hsv-table">
                <thead className="hsv-table-head">
                  <tr>
                    <th className="hsv-table-th">Componente instalado</th>
                    <th className="hsv-table-th">P/N · S/N</th>
                    <th className="hsv-table-th">Fecha</th>
                    <th className="hsv-table-th">Motivo</th>
                    <th className="hsv-table-th">Técnico</th>
                  </tr>
                </thead>
                <tbody className="hsv-table-body">
                  {componentChanges.map((c) => (
                    <tr key={c.id} className="hsv-table-row">
                      <td className="hsv-table-cell font-semibold text-ink">{c.installed_component_name ?? "—"}</td>
                      <td className="hsv-table-cell hsv-technical-value text-ink-muted">
                        {c.installed_part_number ?? "—"} · {c.installed_serial_number ?? "—"}
                      </td>
                      <td className="hsv-table-cell text-ink-muted">{c.installation_date ?? "—"}</td>
                      <td className="hsv-table-cell text-ink-muted">{c.reason ?? "—"}</td>
                      <td className="hsv-table-cell text-ink-muted">{c.technician ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-ink-subtle">Sin registros de cambio de componente todavía.</p>
          )}
        </Panel>
      </div>
    </AppShell>
  );
}
