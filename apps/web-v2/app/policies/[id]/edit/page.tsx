import { notFound } from "next/navigation";
import { Umbrella } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Panel } from "@/components/ui/panel";
import { SectionHeader } from "@/components/ui/section-header";
import { supabase } from "@/lib/supabase";
import { updatePolicy } from "@/app/policies/actions";

type EditPolicyPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditPolicyPage({ params }: EditPolicyPageProps) {
  const { id } = await params;
  const { data: policy } = await supabase.from("insurance_policies").select("*").eq("id", id).maybeSingle();
  if (!policy) notFound();

  const boundUpdate = updatePolicy.bind(null, id);

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <SectionHeader
          eyebrow="Pólizas"
          title={`Editar póliza ${policy.helicopter_registration ?? ""}`}
          description="Corrige aquí cualquier dato que el análisis automático haya detectado mal, y llena la aseguradora (no se detecta sola, ya que suele ser solo un logo/membrete)."
          icon={Umbrella}
        />
        <Panel>
          <form action={boundUpdate} className="grid gap-5 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Aseguradora
              <input className="hsv-control" name="insurer" defaultValue={policy.insurer ?? ""} placeholder="Ej. ASSA, Pan-American Life" />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              N° de póliza
              <input className="hsv-control" name="policyNumber" defaultValue={policy.policy_number ?? ""} />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Tipo de cobertura
              <input className="hsv-control" name="coverageType" defaultValue={policy.coverage_type ?? ""} placeholder="Ej. Casco, Responsabilidad Civil" />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Estado
              <select className="hsv-control" name="status" defaultValue={policy.status}>
                <option value="Active">Active</option>
                <option value="Expired">Expired</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Vigencia desde
              <input className="hsv-control" type="date" name="startDate" defaultValue={policy.start_date ?? ""} />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Vigencia hasta
              <input className="hsv-control" type="date" name="endDate" defaultValue={policy.end_date ?? ""} />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Prima
              <input className="hsv-control" type="number" step="0.01" name="premiumAmount" defaultValue={policy.premium_amount ?? ""} />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Moneda
              <input className="hsv-control" name="currency" defaultValue={policy.currency ?? "USD"} />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Horas mínimas totales del piloto
              <input className="hsv-control" type="number" step="1" name="minPilotHoursTotal" defaultValue={policy.min_pilot_hours_total ?? ""} />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Horas mínimas en tipo (ej. R44)
              <input className="hsv-control" type="number" step="1" name="minPilotHoursType" defaultValue={policy.min_pilot_hours_type ?? ""} />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink sm:col-span-2">
              Requisitos detectados (texto libre — corrígelo si el análisis automático se equivocó)
              <textarea className="hsv-textarea" name="requirementsSummary" defaultValue={policy.requirements_summary ?? ""} rows={4} />
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold text-ink sm:col-span-2">
              <input type="checkbox" name="requirementsReviewed" defaultChecked={policy.requirements_reviewed} />
              Ya revisé estos datos contra el PDF original
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink sm:col-span-2">
              Notas
              <textarea className="hsv-textarea" name="notes" defaultValue={policy.notes ?? ""} />
            </label>
            <div className="sm:col-span-2">
              <button className="hsv-primary-button" type="submit">
                Guardar cambios
              </button>
            </div>
          </form>
        </Panel>
      </div>
    </AppShell>
  );
}
