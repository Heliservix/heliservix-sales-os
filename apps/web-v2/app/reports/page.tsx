import Link from "next/link";
import { ReceiptText, Wrench } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Panel } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status-pill";
import { SectionHeader } from "@/components/ui/section-header";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const STATUS_TONE: Record<string, "green" | "amber" | "blue" | "teal" | "red" | "neutral"> = {
  Draft: "neutral",
  Planned: "blue",
  "Readiness Review": "blue",
  Approved: "teal",
  Active: "green",
  Suspended: "amber",
  Completed: "neutral",
  Cancelled: "red",
  Archived: "neutral"
};

const HELICOPTER_STATUS_TONE: Record<string, "green" | "amber" | "blue" | "teal" | "red" | "neutral"> = {
  Available: "teal",
  Assigned: "blue",
  "In Campaign": "green",
  Maintenance: "amber",
  Grounded: "red",
  Retired: "neutral"
};

export default async function ReportsPage() {
  const [{ data, error }, { data: helicopterData, error: helicopterError }] = await Promise.all([
    supabase
      .from("campaigns")
      .select("id, code, name, status, start_date, vessels:vessel_id(name)")
      .eq("archived", false)
      .order("start_date", { ascending: false }),
    supabase.from("helicopters").select("registration, model, status").eq("archived", false).order("registration")
  ]);

  const campaigns = (data ?? []) as unknown as {
    id: string;
    code: string | null;
    name: string;
    status: string;
    start_date: string | null;
    vessels: { name: string } | null;
  }[];

  const helicopters = (helicopterData ?? []) as { registration: string; model: string; status: string }[];

  return (
    <AppShell>
      <div className="mx-auto max-w-[1100px]">
        <SectionHeader
          eyebrow="Reportes"
          title="Informe por faena"
          description="Un informe completo por cada faena: resumen operativo, nómina, calidad de los reportes semanales, mantenimiento y una opinión gerencial — todo calculado de tus datos reales."
          icon={ReceiptText}
        />

        {error ? <div className="hsv-error-banner">No se pudo conectar con la base de datos: {error.message}.</div> : null}

        <Panel>
          <p className="mb-4 text-sm text-ink-subtle">Elige una faena para generar su informe.</p>
          <div className="hsv-table-wrap">
            <table className="hsv-table">
              <thead className="hsv-table-head">
                <tr>
                  <th className="hsv-table-th">Marea</th>
                  <th className="hsv-table-th">Faena</th>
                  <th className="hsv-table-th">Barco</th>
                  <th className="hsv-table-th">Estado</th>
                  <th className="hsv-table-th"></th>
                </tr>
              </thead>
              <tbody className="hsv-table-body">
                {campaigns.map((c) => (
                  <tr key={c.id} className="hsv-table-row">
                    <td className="hsv-table-cell hsv-technical-value font-semibold text-ink">{c.code || "—"}</td>
                    <td className="hsv-table-cell text-ink-muted">{c.name}</td>
                    <td className="hsv-table-cell text-ink-muted">{c.vessels?.name ?? "—"}</td>
                    <td className="hsv-table-cell">
                      <StatusPill tone={STATUS_TONE[c.status] ?? "neutral"}>{c.status}</StatusPill>
                    </td>
                    <td className="hsv-table-cell text-right">
                      <Link className="hsv-secondary-button" href={`/reports/faena/${c.id}`}>
                        Ver informe
                      </Link>
                    </td>
                  </tr>
                ))}
                {!campaigns.length && !error ? (
                  <tr>
                    <td className="hsv-empty-state" colSpan={5}>
                      No hay faenas registradas todavía.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Panel>

        <div className="mt-8">
          <SectionHeader
            eyebrow="Reportes"
            title="Informe de mantenimiento por aeronave"
            description="Un informe imprimible por helicóptero: salud de la aeronave, estado de componentes, pronóstico de vencimientos, alertas y cumplimiento — todo en una página."
            icon={Wrench}
          />
        </div>

        <Panel>
          {helicopterError ? <div className="hsv-error-banner">No se pudo conectar con la base de datos: {helicopterError.message}.</div> : null}
          <p className="mb-4 text-sm text-ink-subtle">Elige una aeronave para generar su informe de mantenimiento.</p>
          <div className="hsv-table-wrap">
            <table className="hsv-table">
              <thead className="hsv-table-head">
                <tr>
                  <th className="hsv-table-th">Matrícula</th>
                  <th className="hsv-table-th">Modelo</th>
                  <th className="hsv-table-th">Estado</th>
                  <th className="hsv-table-th"></th>
                </tr>
              </thead>
              <tbody className="hsv-table-body">
                {helicopters.map((h) => (
                  <tr key={h.registration} className="hsv-table-row">
                    <td className="hsv-table-cell hsv-technical-value font-semibold text-ink">{h.registration}</td>
                    <td className="hsv-table-cell text-ink-muted">{h.model}</td>
                    <td className="hsv-table-cell">
                      <StatusPill tone={HELICOPTER_STATUS_TONE[h.status] ?? "neutral"}>{h.status}</StatusPill>
                    </td>
                    <td className="hsv-table-cell text-right">
                      <Link className="hsv-secondary-button" href={`/reports/maintenance/${h.registration}`}>
                        Ver informe
                      </Link>
                    </td>
                  </tr>
                ))}
                {!helicopters.length && !helicopterError ? (
                  <tr>
                    <td className="hsv-empty-state" colSpan={4}>
                      No hay aeronaves registradas todavía.
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
