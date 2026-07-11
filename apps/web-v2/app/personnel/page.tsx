import Link from "next/link";
import { Plus, UserRoundCog } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Panel } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status-pill";
import { SectionHeader } from "@/components/ui/section-header";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type PersonnelRow = {
  id: string;
  full_name: string;
  role: string;
  monthly_salary: number | null;
  rate_per_ton: number | null;
  phone: string | null;
  status: string;
};

export default async function PersonnelPage() {
  const { data, error } = await supabase
    .from("personnel")
    .select("id, full_name, role, monthly_salary, rate_per_ton, phone, status")
    .eq("archived", false)
    .order("role")
    .order("full_name");

  const personnel = (data ?? []) as PersonnelRow[];
  const pilots = personnel.filter((p) => p.role === "Piloto");
  const mechanics = personnel.filter((p) => p.role === "Mecánico");

  return (
    <AppShell>
      <div className="mx-auto max-w-[1500px]">
        <SectionHeader
          eyebrow="Operaciones"
          title="Personal"
          description="Pilotos y mecánicos que se asignan a las faenas. Cada persona tiene su propio salario mensual y tarifa por tonelada capturada — los contratos no son iguales para todos."
          icon={UserRoundCog}
        />

        <div className="mb-5 grid gap-4 sm:grid-cols-2">
          <Panel>
            <p className="text-xs font-semibold uppercase text-ink-subtle">Pilotos</p>
            <p className="mt-1 text-2xl font-bold text-ink">{pilots.length}</p>
          </Panel>
          <Panel>
            <p className="text-xs font-semibold uppercase text-ink-subtle">Mecánicos</p>
            <p className="mt-1 text-2xl font-bold text-ink">{mechanics.length}</p>
          </Panel>
        </div>

        <Panel>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <UserRoundCog className="h-5 w-5 text-ink-muted" aria-hidden="true" />
              <h2 className="text-lg font-semibold text-ink">Pilotos y mecánicos</h2>
            </div>
            <Link className="hsv-primary-button" href="/personnel/new">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Agregar persona
            </Link>
          </div>

          {error ? <div className="hsv-error-banner">No se pudo conectar con la base de datos: {error.message}.</div> : null}

          <div className="hsv-table-wrap">
            <table className="hsv-table">
              <thead className="hsv-table-head">
                <tr>
                  <th className="hsv-table-th">Nombre</th>
                  <th className="hsv-table-th">Rol</th>
                  <th className="hsv-table-th">Salario mensual</th>
                  <th className="hsv-table-th">Tarifa por tonelada</th>
                  <th className="hsv-table-th">Teléfono</th>
                  <th className="hsv-table-th">Estado</th>
                </tr>
              </thead>
              <tbody className="hsv-table-body">
                {personnel.map((person) => (
                  <tr key={person.id} className="hsv-table-row">
                    <td className="hsv-table-cell">
                      <Link className="font-semibold text-ink hover:text-aviation-teal" href={`/personnel/${person.id}/edit`}>
                        {person.full_name}
                      </Link>
                    </td>
                    <td className="hsv-table-cell text-ink-muted">{person.role}</td>
                    <td className="hsv-table-cell hsv-technical-value">
                      {person.monthly_salary != null ? `$${Number(person.monthly_salary).toLocaleString("en-US")}/mes` : "—"}
                    </td>
                    <td className="hsv-table-cell hsv-technical-value">
                      {person.rate_per_ton != null ? `$${Number(person.rate_per_ton).toLocaleString("en-US")}/ton` : "—"}
                    </td>
                    <td className="hsv-table-cell text-ink-muted">{person.phone || "—"}</td>
                    <td className="hsv-table-cell">
                      <StatusPill tone={person.status === "Active" ? "green" : "neutral"}>{person.status}</StatusPill>
                    </td>
                  </tr>
                ))}
                {!personnel.length && !error ? (
                  <tr>
                    <td className="hsv-empty-state" colSpan={6}>
                      Todavía no hay pilotos ni mecánicos registrados.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
