import Link from "next/link";
import { Plus, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Panel } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status-pill";
import { SectionHeader } from "@/components/ui/section-header";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type ComplianceItemRow = {
  id: string;
  authority: string;
  compliance_type: string;
  reference_number: string | null;
  title: string;
  due_date: string | null;
  related_helicopter: string | null;
  status: string;
};

const STATUS_TONE: Record<string, "green" | "amber" | "blue" | "teal" | "red" | "neutral"> = {
  "Not reviewed": "neutral",
  Applicable: "amber",
  "Not applicable": "neutral",
  "In progress": "blue",
  Complied: "green",
  Overdue: "red"
};

function daysUntil(dueDate: string | null): number | null {
  if (!dueDate) return null;
  const diff = new Date(`${dueDate}T00:00:00Z`).getTime() - new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z").getTime();
  return Math.round(diff / 86400000);
}

function dueTone(days: number | null): "green" | "amber" | "red" | "neutral" {
  if (days == null) return "neutral";
  if (days < 0) return "red";
  if (days <= 30) return "amber";
  return "green";
}

export default async function CompliancePage() {
  const { data, error } = await supabase
    .from("compliance_items")
    .select("id, authority, compliance_type, reference_number, title, due_date, related_helicopter, status")
    .eq("archived", false)
    .order("due_date", { ascending: true, nullsFirst: false });

  const items = (data ?? []) as ComplianceItemRow[];
  const openItems = items.filter((item) => item.status !== "Complied" && item.status !== "Not applicable");
  const overdue = openItems.filter((item) => (daysUntil(item.due_date) ?? 1) < 0);
  const dueSoon = openItems.filter((item) => {
    const days = daysUntil(item.due_date);
    return days != null && days >= 0 && days <= 30;
  });

  return (
    <AppShell>
      <div className="mx-auto max-w-[1500px]">
        <SectionHeader
          eyebrow="Mantenimiento"
          title="Cumplimiento"
          description="Directivas de Aeronavegabilidad (AD), boletines de servicio (SB), revisiones de manual y requisitos operacionales — por autoridad y fecha límite."
          icon={ShieldCheck}
        />

        <div className="mb-5 grid gap-4 sm:grid-cols-3">
          <Panel>
            <p className="text-xs font-semibold uppercase text-ink-subtle">Abiertos</p>
            <p className="mt-1 text-2xl font-bold text-ink">{openItems.length}</p>
          </Panel>
          <Panel>
            <p className="text-xs font-semibold uppercase text-ink-subtle">Vencidos</p>
            <p className={`mt-1 text-2xl font-bold ${overdue.length > 0 ? "text-status-red" : "text-ink"}`}>{overdue.length}</p>
          </Panel>
          <Panel>
            <p className="text-xs font-semibold uppercase text-ink-subtle">Vencen en ≤30 días</p>
            <p className={`mt-1 text-2xl font-bold ${dueSoon.length > 0 ? "text-amber-600" : "text-ink"}`}>{dueSoon.length}</p>
          </Panel>
        </div>

        <Panel>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-ink-muted" aria-hidden="true" />
              <h2 className="text-lg font-semibold text-ink">Ítems de cumplimiento</h2>
            </div>
            <Link className="hsv-primary-button" href="/compliance/new">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Agregar ítem
            </Link>
          </div>

          {error ? <div className="hsv-error-banner">No se pudo conectar con la base de datos: {error.message}.</div> : null}

          <div className="hsv-table-wrap">
            <table className="hsv-table">
              <thead className="hsv-table-head">
                <tr>
                  <th className="hsv-table-th">Autoridad</th>
                  <th className="hsv-table-th">Tipo</th>
                  <th className="hsv-table-th">Referencia</th>
                  <th className="hsv-table-th">Título</th>
                  <th className="hsv-table-th">Helicóptero</th>
                  <th className="hsv-table-th">Vence</th>
                  <th className="hsv-table-th">Estado</th>
                </tr>
              </thead>
              <tbody className="hsv-table-body">
                {items.map((item) => {
                  const days = daysUntil(item.due_date);
                  const tone = dueTone(days);
                  return (
                    <tr key={item.id} className="hsv-table-row">
                      <td className="hsv-table-cell text-ink-muted">{item.authority}</td>
                      <td className="hsv-table-cell text-ink-muted">{item.compliance_type}</td>
                      <td className="hsv-table-cell hsv-technical-value">{item.reference_number || "—"}</td>
                      <td className="hsv-table-cell">
                        <Link className="font-semibold text-ink hover:text-aviation-teal" href={`/compliance/${item.id}/edit`}>
                          {item.title}
                        </Link>
                      </td>
                      <td className="hsv-table-cell text-ink-muted">
                        {item.related_helicopter ? (
                          <Link className="hover:text-aviation-teal" href={`/helicopters/${item.related_helicopter}`}>
                            {item.related_helicopter}
                          </Link>
                        ) : (
                          "Toda la flota"
                        )}
                      </td>
                      <td className="hsv-table-cell">
                        {item.due_date ? (
                          <span className={tone === "red" ? "font-semibold text-status-red" : tone === "amber" ? "font-semibold text-amber-600" : "text-ink-muted"}>
                            {item.due_date} {days != null ? `(${days < 0 ? `${Math.abs(days)} días vencido` : `${days} días`})` : ""}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="hsv-table-cell">
                        <StatusPill tone={STATUS_TONE[item.status] ?? "neutral"}>{item.status}</StatusPill>
                      </td>
                    </tr>
                  );
                })}
                {!items.length && !error ? (
                  <tr>
                    <td className="hsv-empty-state" colSpan={7}>
                      Todavía no hay ítems de cumplimiento registrados.
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
