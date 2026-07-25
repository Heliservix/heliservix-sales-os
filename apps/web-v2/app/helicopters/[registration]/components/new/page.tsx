import { notFound } from "next/navigation";
import { Wrench } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Panel } from "@/components/ui/panel";
import { SectionHeader } from "@/components/ui/section-header";
import { supabase } from "@/lib/supabase";
import { createComponent } from "@/app/helicopters/[registration]/components/actions";

type NewComponentPageProps = {
  params: Promise<{ registration: string }>;
};

export default async function NewComponentPage({ params }: NewComponentPageProps) {
  const { registration } = await params;
  const { data: helicopter } = await supabase.from("helicopters").select("registration").eq("registration", registration).maybeSingle();
  if (!helicopter) notFound();

  const boundCreate = createComponent.bind(null, registration);

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <SectionHeader
          eyebrow="Componentes"
          title={`Agregar componente a ${registration}`}
          description="Para uno o dos componentes sueltos. Si vas a cargar la lista completa, usa el importador de Excel."
          icon={Wrench}
        />
        <Panel>
          <form action={boundCreate} className="grid gap-5 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-semibold text-ink sm:col-span-2">
              Componente
              <input className="hsv-control" name="componentName" placeholder="MRGB" required />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              P/N
              <input className="hsv-control" name="partNumber" placeholder="C006-7" required />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              S/N
              <input className="hsv-control" name="serialNumber" placeholder="3188" />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Categoría
              <input className="hsv-control" name="category" placeholder="Dinámico" />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Posición
              <input className="hsv-control" name="position" placeholder="N/A" />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Fecha de instalación
              <input className="hsv-control" type="date" name="installationDate" />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              TSN (hrs)
              <input className="hsv-control" type="number" step="0.1" name="tsnHours" defaultValue={0} />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              TSO (hrs)
              <input className="hsv-control" type="number" step="0.1" name="tsoHours" defaultValue={0} />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Límite de vida (hrs)
              <input className="hsv-control" type="number" step="0.1" name="lifeLimitHours" defaultValue={0} required />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Remanente (hrs)
              <input className="hsv-control" type="number" step="0.1" name="remainingHours" defaultValue={0} required />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Fecha límite de calendario
              <input className="hsv-control" type="date" name="calendarLimitDate" />
            </label>
            <label className="flex items-start gap-2 self-end text-xs text-ink-subtle">
              <input className="mt-0.5" type="checkbox" name="noCalendarLimit" />
              Sin límite de calendario (componente &ldquo;LIFE&rdquo; u &ldquo;ON CONDITION&rdquo; real)
            </label>
            <p className="text-xs text-ink-subtle sm:col-span-2">
              Si no marcas la casilla y dejas &ldquo;Fecha límite de calendario&rdquo; vacía pero sí pones fecha de instalación, se
              calcula automáticamente a 12 años desde la instalación (regla estándar del manual de mantenimiento). Si este
              componente tiene un límite distinto documentado, escríbelo arriba y se respeta ese en vez del cálculo de 12 años.
            </p>
            <label className="grid gap-1.5 text-sm font-semibold text-ink sm:col-span-2">
              Notas
              <textarea className="hsv-textarea" name="notes" />
            </label>
            <div className="sm:col-span-2">
              <button className="hsv-primary-button" type="submit">
                Guardar componente
              </button>
            </div>
          </form>
        </Panel>
      </div>
    </AppShell>
  );
}
