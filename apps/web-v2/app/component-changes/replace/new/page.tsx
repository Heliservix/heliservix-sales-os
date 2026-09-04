import { Replace } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Panel } from "@/components/ui/panel";
import { SectionHeader } from "@/components/ui/section-header";
import { SignaturePad } from "@/components/ui/signature-pad";
import { fetchActiveComponentsForPicker, fetchTechniciansForPicker } from "@/lib/component-swap";
import { replaceComponent } from "@/app/component-changes/actions";
import { getTechnicianScope } from "@/lib/technician-scope";

export const dynamic = "force-dynamic";

export default async function ReplaceComponentPage() {
  const { scopedRegistration } = await getTechnicianScope();
  const [allComponents, technicians] = await Promise.all([fetchActiveComponentsForPicker(), fetchTechniciansForPicker()]);
  const components = scopedRegistration ? allComponents.filter((c) => c.helicopterRegistration === scopedRegistration) : allComponents;

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <SectionHeader
          eyebrow="Mantenimiento — Cambios de Componentes"
          title="Cambiar por componente nuevo"
          description="Retira la pieza actual (queda en el historial como Removida) y da de alta una pieza nueva en el mismo helicóptero, sin relación a otra aeronave."
          icon={Replace}
        />
        <Panel>
          <form action={replaceComponent} encType="multipart/form-data" className="grid gap-5 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-semibold text-ink sm:col-span-2">
              Componente a remover
              <select className="hsv-control" name="oldComponentId" required defaultValue="">
                <option value="" disabled>
                  Selecciona…
                </option>
                {components.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="sm:col-span-2 rounded-lg border border-line bg-canvas-muted p-3">
              <p className="text-sm font-semibold text-ink">Datos del componente nuevo</p>
              <p className="mt-1 text-xs text-ink-subtle">
                Se agrega como un componente activo aparte — igual que en &ldquo;Agregar componente&rdquo; dentro de la ficha del
                helicóptero.
              </p>
            </div>

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
              <input className="hsv-control" type="date" name="installationDate" defaultValue={new Date().toISOString().slice(0, 10)} />
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
              Si no marcas la casilla y dejas &ldquo;Fecha límite de calendario&rdquo; vacía, se calcula automáticamente a 12 años
              desde la instalación.
            </p>
            <label className="grid gap-1.5 text-sm font-semibold text-ink sm:col-span-2">
              Notas del componente
              <textarea className="hsv-textarea" name="componentNotes" />
            </label>

            <div className="sm:col-span-2 border-t border-line pt-4">
              <p className="text-sm font-semibold text-ink">El cambio en sí</p>
            </div>

            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Técnico que hace el cambio
              <select className="hsv-control" name="technicianId" required defaultValue="">
                <option value="" disabled>
                  Selecciona…
                </option>
                {technicians.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.fullName} ({t.role})
                  </option>
                ))}
              </select>
            </label>
            <div />

            <label className="grid gap-1.5 text-sm font-semibold text-ink sm:col-span-2">
              Motivo del cambio
              <textarea className="hsv-textarea" name="reason" placeholder="Ej. venció por horas / vida útil" />
            </label>

            <label className="grid gap-1.5 text-sm font-semibold text-ink sm:col-span-2">
              Foto del cambio
              <input className="hsv-control" type="file" name="photo" accept="image/*" capture="environment" />
            </label>

            <div className="sm:col-span-2">
              <SignaturePad name="signatureDataUrl" label="Firma del técnico" />
            </div>

            <label className="grid gap-1.5 text-sm font-semibold text-ink sm:col-span-2">
              Notas adicionales del cambio
              <textarea className="hsv-textarea" name="notes" />
            </label>

            <div className="sm:col-span-2">
              <button className="hsv-primary-button" type="submit">
                Registrar cambio de componente
              </button>
            </div>
          </form>
        </Panel>
      </div>
    </AppShell>
  );
}
