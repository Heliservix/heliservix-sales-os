import { ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Panel } from "@/components/ui/panel";
import { SectionHeader } from "@/components/ui/section-header";
import { supabase } from "@/lib/supabase";
import { createComplianceItem } from "@/app/compliance/actions";
import { complianceAuthorities, complianceTypes, complianceStatuses } from "@/app/compliance/constants";

export default async function NewComplianceItemPage() {
  const { data: helicopters } = await supabase.from("helicopters").select("registration").eq("archived", false).order("registration");

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <SectionHeader
          eyebrow="Cumplimiento"
          title="Agregar ítem de cumplimiento"
          description="AD, SB, revisión de manual, requisito operacional o límite de vida — con su autoridad y fecha límite."
          icon={ShieldCheck}
        />
        <Panel>
          <form action={createComplianceItem} className="grid gap-5 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Autoridad
              <select className="hsv-control" name="authority" defaultValue="AAC Panama">
                {complianceAuthorities.map((authority) => (
                  <option key={authority} value={authority}>{authority}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Tipo
              <select className="hsv-control" name="complianceType" defaultValue="AD">
                {complianceTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink sm:col-span-2">
              Título
              <input className="hsv-control" name="title" placeholder="AD 2024-XX-XX — Inspección de pala de rotor principal" required />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              N° de referencia
              <input className="hsv-control" name="referenceNumber" />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Helicóptero relacionado
              <select className="hsv-control" name="relatedHelicopter" defaultValue="">
                <option value="">Toda la flota</option>
                {(helicopters ?? []).map((h) => (
                  <option key={h.registration} value={h.registration}>{h.registration}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Fecha efectiva
              <input className="hsv-control" type="date" name="effectiveDate" />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Fecha límite
              <input className="hsv-control" type="date" name="dueDate" />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Vencimiento por horas (horómetro)
              <input className="hsv-control" type="number" step="0.1" name="dueHours" placeholder="Ej. 2200" />
            </label>
            <p className="self-end text-xs text-ink-subtle">
              Solo aplica si eliges un helicóptero específico arriba (no &ldquo;Toda la flota&rdquo;). Ej.: el kit de
              inspección de 2200 horas de Robinson para R44 Raven I/Clipper I.
            </p>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Estado
              <select className="hsv-control" name="status" defaultValue="Not reviewed">
                {complianceStatuses.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink sm:col-span-2">
              Aplicabilidad
              <input className="hsv-control" name="applicability" placeholder="Todos los R44 Clipper II con S/N anteriores a..." />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink sm:col-span-2">
              Notas
              <textarea className="hsv-textarea" name="notes" />
            </label>
            <div className="sm:col-span-2">
              <button className="hsv-primary-button" type="submit">
                Guardar ítem
              </button>
            </div>
          </form>
        </Panel>
      </div>
    </AppShell>
  );
}
