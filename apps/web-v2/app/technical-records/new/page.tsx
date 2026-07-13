import { FileText } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Panel } from "@/components/ui/panel";
import { SectionHeader } from "@/components/ui/section-header";
import { supabase } from "@/lib/supabase";
import { createTechnicalRecord } from "@/app/technical-records/actions";
import { technicalRecordTypes } from "@/app/technical-records/constants";

export default async function NewTechnicalRecordPage() {
  const { data: helicopters } = await supabase.from("helicopters").select("registration").eq("archived", false).order("registration");

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <SectionHeader
          eyebrow="Registros Técnicos"
          title="Agregar registro"
          description="8130, hoja de logbook, orden de trabajo, factura, certificado, release to service, etc."
          icon={FileText}
        />
        <Panel>
          <form action={createTechnicalRecord} className="grid gap-5 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Tipo de registro
              <select className="hsv-control" name="recordType" defaultValue="Other">
                {technicalRecordTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Helicóptero relacionado
              <select className="hsv-control" name="relatedHelicopter" defaultValue="">
                <option value="">Sin asignar</option>
                {(helicopters ?? []).map((h) => (
                  <option key={h.registration} value={h.registration}>{h.registration}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink sm:col-span-2">
              Título
              <input className="hsv-control" name="title" placeholder="8130 — MRGB overhaul" required />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              N° de documento
              <input className="hsv-control" name="documentNumber" />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Fecha del documento
              <input className="hsv-control" type="date" name="recordDate" />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink sm:col-span-2">
              Notas
              <textarea className="hsv-textarea" name="notes" />
            </label>
            <div className="sm:col-span-2">
              <button className="hsv-primary-button" type="submit">
                Guardar registro
              </button>
            </div>
          </form>
        </Panel>
      </div>
    </AppShell>
  );
}
