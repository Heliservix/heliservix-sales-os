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
              Correo (para su acceso al Portal Técnico)
              <input className="hsv-control" type="email" name="email" placeholder="Ej. nombre@correo.com" />
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
              <h2 className="mt-2 border-t border-line pt-4 text-sm font-semibold text-ink">
                Documentos (licencia, médico, pasaporte — sobre todo para pilotos)
              </h2>
              <p className="mt-1 text-xs text-ink-subtle">
                Esto controla el cumplimiento de requisitos de las pólizas de seguro (módulo Pólizas) y avisa en Alertas cuando algo
                está por vencer. Puedes dejarlo vacío y llenarlo después.
              </p>
            </div>

            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Horas de experiencia previas (antes de este sistema)
              <input className="hsv-control" type="number" step="1" name="priorExperienceHours" placeholder="Ej. 3500" />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              N° de licencia
              <input className="hsv-control" name="licenseNumber" />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Tipo de licencia
              <input className="hsv-control" name="licenseType" placeholder="Ej. PC Piloto Comercial" />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Vencimiento de licencia
              <input className="hsv-control" type="date" name="licenseExpiry" />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Clase de certificado médico
              <input className="hsv-control" name="medicalCertificateClass" placeholder="Ej. Primera clase" />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Vencimiento de certificado médico
              <input className="hsv-control" type="date" name="medicalCertificateExpiry" />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Fecha de última recurrencia
              <input className="hsv-control" type="date" name="recurrencyDate" />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Vencimiento de recurrencia
              <input className="hsv-control" type="date" name="recurrencyExpiry" />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Fecha de último chequeo de vuelo
              <input className="hsv-control" type="date" name="flightCheckDate" />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Vencimiento de chequeo de vuelo
              <input className="hsv-control" type="date" name="flightCheckExpiry" />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              N° de pasaporte
              <input className="hsv-control" name="passportNumber" />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Vencimiento de pasaporte
              <input className="hsv-control" type="date" name="passportExpiry" />
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
