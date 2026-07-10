import { notFound } from "next/navigation";
import { Wrench } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Panel } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status-pill";
import { SectionHeader } from "@/components/ui/section-header";
import { supabase } from "@/lib/supabase";
import { updateComponent, markComponentRemoved, deleteComponent } from "@/app/helicopters/[registration]/components/actions";

type EditComponentPageProps = {
  params: Promise<{ registration: string; id: string }>;
};

export default async function EditComponentPage({ params }: EditComponentPageProps) {
  const { registration, id } = await params;
  const { data: component } = await supabase.from("components").select("*").eq("id", id).maybeSingle();
  if (!component || component.helicopter_registration !== registration) notFound();

  const boundUpdate = updateComponent.bind(null, registration, id);
  const boundRemove = markComponentRemoved.bind(null, registration, id);
  const boundDelete = deleteComponent.bind(null, registration, id);

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <SectionHeader
          eyebrow="Componentes"
          title={`Editar ${component.component_name}`}
          description={`${registration} — P/N ${component.part_number} · S/N ${component.serial_number || "N/A"}`}
          icon={Wrench}
        />

        <Panel className="mb-5">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-ink-muted">Estado calculado automáticamente:</span>
            <StatusPill tone={component.status === "OK" ? "green" : component.status === "Monitor" ? "amber" : "red"}>
              {component.status}
            </StatusPill>
            <span className="text-sm text-ink-subtle">({Number(component.remaining_percentage).toFixed(1)}% remanente)</span>
          </div>
          <p className="mt-2 text-xs text-ink-subtle">
            No se edita a mano — se recalcula solo a partir de las horas y la fecha de calendario que guardes abajo.
          </p>
        </Panel>

        <Panel>
          <form action={boundUpdate} className="grid gap-5 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-semibold text-ink sm:col-span-2">
              Componente
              <input className="hsv-control" name="componentName" defaultValue={component.component_name} required />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              P/N
              <input className="hsv-control" name="partNumber" defaultValue={component.part_number} required />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              S/N
              <input className="hsv-control" name="serialNumber" defaultValue={component.serial_number} />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Categoría
              <input className="hsv-control" name="category" defaultValue={component.category ?? ""} />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Posición
              <input className="hsv-control" name="position" defaultValue={component.position ?? ""} />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Fecha de instalación
              <input className="hsv-control" type="date" name="installationDate" defaultValue={component.installation_date ?? ""} />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              TSN (hrs)
              <input className="hsv-control" type="number" step="0.1" name="tsnHours" defaultValue={component.tsn_hours} />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              TSO (hrs)
              <input className="hsv-control" type="number" step="0.1" name="tsoHours" defaultValue={component.tso_hours} />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Límite de vida (hrs)
              <input className="hsv-control" type="number" step="0.1" name="lifeLimitHours" defaultValue={component.life_limit_hours} required />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Remanente (hrs)
              <input className="hsv-control" type="number" step="0.1" name="remainingHours" defaultValue={component.remaining_hours} required />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Fecha límite de calendario
              <input className="hsv-control" type="date" name="calendarLimitDate" defaultValue={component.calendar_limit_date ?? ""} />
            </label>
            <p className="self-end text-xs text-ink-subtle">
              Déjalo vacío si el componente es &ldquo;LIFE&rdquo; u &ldquo;ON CONDITION&rdquo; (sin límite de calendario).
            </p>
            <label className="grid gap-1.5 text-sm font-semibold text-ink sm:col-span-2">
              Notas
              <textarea className="hsv-textarea" name="notes" defaultValue={component.notes ?? ""} />
            </label>
            <div className="flex flex-wrap gap-3 sm:col-span-2">
              <button className="hsv-primary-button" type="submit">
                Guardar cambios
              </button>
            </div>
          </form>
        </Panel>

        <Panel className="mt-5">
          <h2 className="text-sm font-semibold text-ink">Zona de riesgo</h2>
          <p className="mt-1 text-sm text-ink-subtle">
            &ldquo;Quitar&rdquo; lo saca de la lista activa pero conserva su historial (recomendado). &ldquo;Eliminar&rdquo; lo borra
            por completo — solo para errores de carga.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <form action={boundRemove}>
              <button className="hsv-secondary-button" type="submit">
                Quitar (Removed)
              </button>
            </form>
            <form action={boundDelete}>
              <button className="hsv-danger-button" type="submit">
                Eliminar definitivamente
              </button>
            </form>
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
