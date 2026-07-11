import { notFound } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Panel } from "@/components/ui/panel";
import { SectionHeader } from "@/components/ui/section-header";
import { supabase } from "@/lib/supabase";
import { updateComplianceItem, archiveComplianceItem } from "@/app/compliance/actions";
import { complianceAuthorities, complianceTypes, complianceStatuses } from "@/app/compliance/constants";

type EditComplianceItemPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditComplianceItemPage({ params }: EditComplianceItemPageProps) {
  const { id } = await params;
  const [{ data: item }, { data: helicopters }] = await Promise.all([
    supabase.from("compliance_items").select("*").eq("id", id).maybeSingle(),
    supabase.from("helicopters").select("registration").eq("archived", false).order("registration")
  ]);
  if (!item) notFound();

  const boundUpdate = updateComplianceItem.bind(null, id);
  const boundArchive = archiveComplianceItem.bind(null, id);

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <SectionHeader eyebrow="Cumplimiento" title={`Editar ${item.title}`} description={item.reference_number ?? ""} icon={ShieldCheck} />
        <Panel>
          <form action={boundUpdate} className="grid gap-5 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Autoridad
              <select className="hsv-control" name="authority" defaultValue={item.authority}>
                {complianceAuthorities.map((authority) => (
                  <option key={authority} value={authority}>{authority}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Tipo
              <select className="hsv-control" name="complianceType" defaultValue={item.compliance_type}>
                {complianceTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink sm:col-span-2">
              Título
              <input className="hsv-control" name="title" defaultValue={item.title} required />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              N° de referencia
              <input className="hsv-control" name="referenceNumber" defaultValue={item.reference_number ?? ""} />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Helicóptero relacionado
              <select className="hsv-control" name="relatedHelicopter" defaultValue={item.related_helicopter ?? ""}>
                <option value="">Toda la flota</option>
                {(helicopters ?? []).map((h) => (
                  <option key={h.registration} value={h.registration}>{h.registration}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Fecha efectiva
              <input className="hsv-control" type="date" name="effectiveDate" defaultValue={item.effective_date ?? ""} />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Fecha límite
              <input className="hsv-control" type="date" name="dueDate" defaultValue={item.due_date ?? ""} />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Vencimiento por horas (horómetro)
              <input className="hsv-control" type="number" step="0.1" name="dueHours" defaultValue={item.due_hours ?? ""} placeholder="Ej. 2200" />
            </label>
            <p className="self-end text-xs text-ink-subtle">
              Solo aplica si eliges un helicóptero específico arriba (no &ldquo;Toda la flota&rdquo;).
            </p>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Estado
              <select className="hsv-control" name="status" defaultValue={item.status}>
                {complianceStatuses.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink sm:col-span-2">
              Aplicabilidad
              <input className="hsv-control" name="applicability" defaultValue={item.applicability ?? ""} />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink sm:col-span-2">
              Notas
              <textarea className="hsv-textarea" name="notes" defaultValue={item.notes ?? ""} />
            </label>
            <div className="sm:col-span-2">
              <button className="hsv-primary-button" type="submit">
                Guardar cambios
              </button>
            </div>
          </form>
        </Panel>

        <Panel className="mt-5">
          <h2 className="text-sm font-semibold text-ink">Zona de riesgo</h2>
          <div className="mt-4">
            <form action={boundArchive}>
              <button className="hsv-danger-button" type="submit">
                Archivar ítem
              </button>
            </form>
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
