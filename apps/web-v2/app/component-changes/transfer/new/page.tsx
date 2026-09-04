import { ArrowLeftRight } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Panel } from "@/components/ui/panel";
import { SectionHeader } from "@/components/ui/section-header";
import { SignaturePad } from "@/components/ui/signature-pad";
import { supabase } from "@/lib/supabase";
import { fetchActiveComponentsForPicker, fetchTechniciansForPicker } from "@/lib/component-swap";
import { transferComponent } from "@/app/component-changes/actions";
import { getTechnicianScope } from "@/lib/technician-scope";

export const dynamic = "force-dynamic";

export default async function TransferComponentPage() {
  const { scopedRegistration } = await getTechnicianScope();
  const [allComponents, technicians, { data: helicopters }] = await Promise.all([
    fetchActiveComponentsForPicker(),
    fetchTechniciansForPicker(),
    supabase.from("helicopters").select("registration, model").eq("archived", false).order("registration")
  ]);
  // La pieza que se mueve debe ser de tu propia aeronave — pero la pieza que
  // "regresa a cambio" en un intercambio pertenece al helicóptero DESTINO
  // (cualquiera de la flota), así que esa lista no se acota.
  const components = scopedRegistration ? allComponents.filter((c) => c.helicopterRegistration === scopedRegistration) : allComponents;

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <SectionHeader
          eyebrow="Mantenimiento — Cambios de Componentes"
          title="Transferir componente entre helicópteros"
          description="Mueve la misma pieza física de un helicóptero a otro. Sus horas TSN/TSO, horas remanentes y límite de calendario viajan con ella — no se resetean. Si el destino te da otra pieza a cambio (intercambio), agrégala abajo para que ambas se muevan en la misma acción."
          icon={ArrowLeftRight}
        />
        <Panel>
          <form action={transferComponent} encType="multipart/form-data" className="grid gap-5 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-semibold text-ink sm:col-span-2">
              Componente a mover
              <select className="hsv-control" name="componentId" required defaultValue="">
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

            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Helicóptero destino
              <select className="hsv-control" name="toRegistration" required defaultValue="">
                <option value="" disabled>
                  Selecciona…
                </option>
                {(helicopters ?? []).map((h) => (
                  <option key={h.registration} value={h.registration}>
                    {h.registration} — {h.model}
                  </option>
                ))}
              </select>
            </label>

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

            <div className="sm:col-span-2 rounded-lg border border-line bg-canvas-muted p-3">
              <p className="text-sm font-semibold text-ink">¿Es un intercambio?</p>
              <p className="mt-1 text-xs text-ink-subtle">
                Si el helicóptero destino te entrega otra pieza a cambio (ej. cambiaron carburadores entre dos helicópteros),
                selecciónala aquí — se mueve de vuelta al origen en esta misma acción. Si dejas &ldquo;No&rdquo;, solo se mueve la
                pieza de arriba, en un solo sentido.
              </p>
            </div>
            <label className="grid gap-1.5 text-sm font-semibold text-ink sm:col-span-2">
              Componente que regresa a cambio (opcional)
              <select className="hsv-control" name="returnComponentId" defaultValue="">
                <option value="">No, es solo un movimiento en un sentido</option>
                {allComponents.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
              <span className="text-xs text-ink-subtle">Debe pertenecer al helicóptero destino que elegiste arriba.</span>
            </label>

            <label className="grid gap-1.5 text-sm font-semibold text-ink sm:col-span-2">
              Motivo del cambio
              <textarea className="hsv-textarea" name="reason" placeholder="Ej. préstamo mientras se repara el otro helicóptero" />
            </label>

            <label className="grid gap-1.5 text-sm font-semibold text-ink sm:col-span-2">
              Foto del cambio
              <input className="hsv-control" type="file" name="photo" accept="image/*" capture="environment" />
            </label>

            <div className="sm:col-span-2">
              <SignaturePad name="signatureDataUrl" label="Firma del técnico" />
            </div>

            <label className="grid gap-1.5 text-sm font-semibold text-ink sm:col-span-2">
              Notas adicionales
              <textarea className="hsv-textarea" name="notes" />
            </label>

            <div className="sm:col-span-2">
              <button className="hsv-primary-button" type="submit">
                Registrar transferencia
              </button>
            </div>
          </form>
        </Panel>
      </div>
    </AppShell>
  );
}
