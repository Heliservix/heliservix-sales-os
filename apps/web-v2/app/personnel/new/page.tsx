import { UserRoundCog } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Panel } from "@/components/ui/panel";
import { SectionHeader } from "@/components/ui/section-header";
import { createPersonnel } from "@/app/personnel/actions";
import { personnelRoles, personnelStatuses } from "@/app/personnel/constants";

export default function NewPersonnelPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <SectionHeader
          eyebrow="Personal"
          title="Agregar piloto o mecánico"
          description="El salario mensual y la tarifa por tonelada son específicos de cada persona — revisa el contrato de cada uno antes de llenarlos."
          icon={UserRoundCog}
        />
        <Panel>
          <form action={createPersonnel} className="grid gap-5 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-semibold text-ink sm:col-span-2">
              Nombre completo
              <input className="hsv-control" name="fullName" required />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Rol
              <select className="hsv-control" name="role" defaultValue="Piloto">
                {personnelRoles.map((role) => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Teléfono
              <input className="hsv-control" name="phone" />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Salario mensual (USD)
              <input className="hsv-control" type="number" step="0.01" name="monthlySalary" placeholder="Ej. 4500" />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Tarifa por tonelada capturada (USD)
              <input className="hsv-control" type="number" step="0.01" name="ratePerTon" placeholder="Ej. 10" />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Estado
              <select className="hsv-control" name="status" defaultValue="Active">
                {personnelStatuses.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink sm:col-span-2">
              Notas
              <textarea className="hsv-textarea" name="notes" placeholder="Referencia de contrato, condiciones especiales, etc." />
            </label>
            <div className="sm:col-span-2">
              <button className="hsv-primary-button" type="submit">
                Guardar persona
              </button>
            </div>
          </form>
        </Panel>
      </div>
    </AppShell>
  );
}
