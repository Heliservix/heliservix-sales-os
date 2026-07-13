import { notFound } from "next/navigation";
import { UserRoundCog } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Panel } from "@/components/ui/panel";
import { SectionHeader } from "@/components/ui/section-header";
import { supabase } from "@/lib/supabase";
import { updatePersonnel, archivePersonnel } from "@/app/personnel/actions";
import { personnelRoles, personnelStatuses } from "@/app/personnel/constants";

type EditPersonnelPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditPersonnelPage({ params }: EditPersonnelPageProps) {
  const { id } = await params;
  const { data: person } = await supabase.from("personnel").select("*").eq("id", id).maybeSingle();
  if (!person) notFound();

  const boundUpdate = updatePersonnel.bind(null, id);
  const boundArchive = archivePersonnel.bind(null, id);

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <SectionHeader eyebrow="Personal" title={`Editar ${person.full_name}`} description={person.role} icon={UserRoundCog} />
        <Panel>
          <form action={boundUpdate} className="grid gap-5 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-semibold text-ink sm:col-span-2">
              Nombre completo
              <input className="hsv-control" name="fullName" defaultValue={person.full_name} required />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Rol
              <select className="hsv-control" name="role" defaultValue={person.role}>
                {personnelRoles.map((role) => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Teléfono
              <input className="hsv-control" name="phone" defaultValue={person.phone ?? ""} />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Correo (para su acceso al Portal Técnico)
              <input className="hsv-control" type="email" name="email" defaultValue={person.email ?? ""} placeholder="Ej. nombre@correo.com" />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Salario mensual (USD)
              <input className="hsv-control" type="number" step="0.01" name="monthlySalary" defaultValue={person.monthly_salary ?? ""} />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Tarifa por tonelada capturada (USD)
              <input className="hsv-control" type="number" step="0.01" name="ratePerTon" defaultValue={person.rate_per_ton ?? ""} />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Estado
              <select className="hsv-control" name="status" defaultValue={person.status}>
                {personnelStatuses.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink sm:col-span-2">
              Notas
              <textarea className="hsv-textarea" name="notes" defaultValue={person.notes ?? ""} />
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
          <p className="mt-1 text-sm text-ink-subtle">
            Archivar quita a esta persona de las listas de asignación, pero conserva su historial en las faenas ya registradas.
          </p>
          <div className="mt-4">
            <form action={boundArchive}>
              <button className="hsv-danger-button" type="submit">
                Archivar
              </button>
            </form>
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
