import Link from "next/link";
import { ExternalLink, Umbrella } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Panel } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status-pill";
import { SectionHeader } from "@/components/ui/section-header";
import { supabase } from "@/lib/supabase";
import { fetchFaenaData, computePersonnelFlightHours } from "@/lib/faena-metrics";
import { PolicyUploadForm } from "@/app/policies/policy-upload-form";
import { PolicyPaymentActions } from "@/app/policies/policy-payment-actions";
import { ReanalyzeButton } from "@/app/policies/reanalyze-button";
import { AnexoUploadForm } from "@/app/policies/anexo-upload-form";
import { addPolicyPayment, markRequirementsReviewed, archivePolicy } from "@/app/policies/actions";
import type { PilotRequirementBlock } from "@/lib/insurance-policy-analysis";

export const dynamic = "force-dynamic";

type PolicyRow = {
  id: string;
  helicopter_registration: string | null;
  insurer: string | null;
  insured_name: string | null;
  policy_number: string | null;
  coverage_type: string | null;
  start_date: string | null;
  end_date: string | null;
  premium_amount: number | null;
  currency: string;
  min_pilot_hours_total: number | null;
  min_pilot_hours_type: number | null;
  requirements_summary: string | null;
  requirements_reviewed: boolean;
  attachment_placeholder: string | null;
  anexo_url: string | null;
  status: string;
  pilot_requirements_detail: PilotRequirementBlock[] | null;
};

// coverage_type stores the raw "USES:-" clause as one long sentence (or a
// "Casco Aéreo + Responsabilidad Civil..." fallback) — split into short
// items so it reads as a practical checklist instead of a paragraph Adolfo
// has to parse himself (asked for explicitly, Aug 2026: "que me muestre la
// información práctica de cobertura... me facilita la interpretación").
function splitCoverageItems(coverageType: string): string[] {
  return coverageType
    .split(/,| y (?=[A-ZÁÉÍÓÚ])| and /)
    .map((s) => s.trim())
    .filter((s) => s.length > 1 && s.length < 120);
}

type PaymentRow = {
  id: string;
  policy_id: string;
  due_date: string;
  amount: number;
  currency: string;
  status: string;
};

type Tone = "green" | "amber" | "red" | "neutral";

function daysUntil(date: string | null): number | null {
  if (!date) return null;
  const diff = new Date(`${date}T00:00:00Z`).getTime() - new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z").getTime();
  return Math.round(diff / 86400000);
}

function dateTone(days: number | null): Tone {
  if (days == null) return "neutral";
  if (days < 0) return "red";
  if (days <= 60) return "amber";
  return "green";
}

function formatDays(days: number | null): string {
  if (days == null) return "";
  if (days < 0) return ` (${Math.abs(days)} días vencida)`;
  return ` (${days} días)`;
}

export default async function PoliciesPage() {
  const [{ data: policyData, error }, { data: paymentData }, { data: helicopterData }, { data: personnelData }, faenaData] = await Promise.all([
    supabase
      .from("insurance_policies")
      .select(
        "id, helicopter_registration, insurer, insured_name, policy_number, coverage_type, start_date, end_date, premium_amount, currency, min_pilot_hours_total, min_pilot_hours_type, requirements_summary, requirements_reviewed, attachment_placeholder, anexo_url, status, pilot_requirements_detail"
      ) // coverage_type was already selected but never rendered below — fixed alongside the analyzer not extracting it at all
      .eq("archived", false)
      .order("end_date", { ascending: true, nullsFirst: false }),
    supabase.from("insurance_payments").select("id, policy_id, due_date, amount, currency, status").order("due_date"),
    supabase.from("helicopters").select("registration, model").eq("archived", false).order("registration"),
    supabase.from("personnel").select("id, full_name, role, prior_experience_hours").eq("archived", false).eq("role", "Piloto"),
    fetchFaenaData()
  ]);

  const policies = (policyData ?? []) as PolicyRow[];
  const payments = (paymentData ?? []) as PaymentRow[];
  const helicopters = helicopterData ?? [];
  const pilots = personnelData ?? [];
  const { campaigns, flightLogs } = faenaData;

  const helicopterModelByRegistration = new Map(helicopters.map((h) => [h.registration, h.model]));
  const paymentsByPolicy = new Map<string, PaymentRow[]>();
  for (const payment of payments) {
    const list = paymentsByPolicy.get(payment.policy_id) ?? [];
    list.push(payment);
    paymentsByPolicy.set(payment.policy_id, list);
  }

  const expiringSoon = policies.filter((p) => p.status === "Active" && dateTone(daysUntil(p.end_date)) !== "green");
  const pendingPayments = payments.filter((p) => p.status !== "Paid");
  const overduePayments = pendingPayments.filter((p) => daysUntil(p.due_date) != null && (daysUntil(p.due_date) as number) < 0);
  const needsReview = policies.filter((p) => !p.requirements_reviewed);

  // For each policy with a minimum-hours requirement, find the pilots who've
  // actually flown that specific helicopter (via campaigns.pilot_id) and
  // compare their computed experience against the requirement — this is the
  // whole point of tracking pilot hours (see lib/faena-metrics.ts).
  function pilotComplianceFor(policy: PolicyRow) {
    if (!policy.helicopter_registration || policy.min_pilot_hours_total == null) return [];
    const pilotIds = new Set(
      campaigns.filter((c) => c.helicopter_registration === policy.helicopter_registration && c.pilot_id).map((c) => c.pilot_id as string)
    );
    return Array.from(pilotIds).map((pilotId) => {
      const pilot = pilots.find((p) => p.id === pilotId);
      const summary = computePersonnelFlightHours(pilotId, campaigns, flightLogs, helicopterModelByRegistration);
      const totalHours = summary.totalHours + Number(pilot?.prior_experience_hours ?? 0);
      const meetsTotal = totalHours >= policy.min_pilot_hours_total!;
      const hoursOnType = policy.helicopter_registration
        ? (summary.hoursByModel[helicopterModelByRegistration.get(policy.helicopter_registration) ?? ""] ?? 0)
        : 0;
      const meetsType = policy.min_pilot_hours_type == null || hoursOnType >= policy.min_pilot_hours_type;
      return { pilotId, name: pilot?.full_name ?? "Piloto desconocido", totalHours, hoursOnType, meetsTotal, meetsType };
    });
  }

  // ==========================================================================
  // "Resumen por Aeronave" — Adolfo asked for this (Aug 2026: "se visualiza
  // demasiada información y me pierdo en ella... quisiera que sea más bien
  // un dashboard que me muestre información por cada helicóptero"). One
  // compact row per fleet aircraft instead of a full policy panel per
  // aircraft; the detailed panels below still have everything, just
  // collapsed behind "Ver detalle completo" so they don't have to be
  // scrolled past to get the at-a-glance picture.
  // ==========================================================================
  const policyByHelicopter = new Map<string, PolicyRow>();
  for (const p of policies) {
    if (!p.helicopter_registration) continue;
    const existing = policyByHelicopter.get(p.helicopter_registration);
    if (!existing || (p.status === "Active" && existing.status !== "Active")) {
      policyByHelicopter.set(p.helicopter_registration, p);
    }
  }

  function nextPendingPaymentFor(policyId: string): PaymentRow | null {
    const pending = (paymentsByPolicy.get(policyId) ?? [])
      .filter((p) => p.status !== "Paid")
      .sort((a, b) => a.due_date.localeCompare(b.due_date));
    return pending[0] ?? null;
  }

  // "Piloto asignado actualmente" — the pilot on this helicopter's currently
  // Active faena, if it has one. A helicopter can only be on one active
  // faena at a time in practice; if more than one somehow shows Active,
  // the most recently started one wins.
  function currentAssignmentFor(registration: string) {
    const active = campaigns
      .filter((c) => c.helicopter_registration === registration && c.status === "Active")
      .sort((a, b) => (b.start_date ?? "").localeCompare(a.start_date ?? ""));
    const campaign = active[0];
    if (!campaign) return null;
    const pilot = campaign.pilot_id ? pilots.find((p) => p.id === campaign.pilot_id) : null;
    return { pilotId: campaign.pilot_id, pilotName: pilot?.full_name ?? "Piloto sin identificar", campaignLabel: campaign.code || campaign.name };
  }

  const severityRank: Record<Tone, number> = { red: 0, amber: 1, neutral: 2, green: 3 };
  function overallToneFor(policy: PolicyRow | undefined, nextPayment: PaymentRow | null): Tone {
    if (!policy) return "neutral";
    const tones: Tone[] = [dateTone(daysUntil(policy.end_date)), nextPayment ? dateTone(daysUntil(nextPayment.due_date)) : "green"];
    if (!policy.requirements_reviewed) tones.push("amber");
    return tones.sort((a, b) => severityRank[a] - severityRank[b])[0];
  }

  const helicopterSummaries = helicopters.map((h) => {
    const policy = policyByHelicopter.get(h.registration);
    const nextPayment = policy ? nextPendingPaymentFor(policy.id) : null;
    const assignment = currentAssignmentFor(h.registration);
    const compliance =
      policy && policy.min_pilot_hours_total != null && assignment
        ? (pilotComplianceFor(policy).find((c) => c.pilotId === assignment.pilotId) ?? null)
        : null;
    return { helicopter: h, policy, nextPayment, assignment, compliance, tone: overallToneFor(policy, nextPayment) };
  });

  return (
    <AppShell>
      <div className="mx-auto max-w-[1500px]">
        <SectionHeader
          eyebrow="Mantenimiento"
          title="Pólizas de Helicópteros"
          description="Sube el PDF de cada póliza — el sistema intenta leer la vigencia, la prima y los requisitos de experiencia del piloto automáticamente. Revisa siempre lo detectado antes de confiar en ello, ya que cada aseguradora redacta distinto."
          icon={Umbrella}
        />

        <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Panel>
            <p className="text-xs font-semibold uppercase text-ink-subtle">Pólizas activas</p>
            <p className="mt-1 text-2xl font-bold text-ink">{policies.filter((p) => p.status === "Active").length}</p>
          </Panel>
          <Panel>
            <p className="text-xs font-semibold uppercase text-ink-subtle">Por vencer / vencidas</p>
            <p className={`mt-1 text-2xl font-bold ${expiringSoon.length > 0 ? "text-status-red" : "text-ink"}`}>{expiringSoon.length}</p>
          </Panel>
          <Panel>
            <p className="text-xs font-semibold uppercase text-ink-subtle">Pagos pendientes</p>
            <p className={`mt-1 text-2xl font-bold ${overduePayments.length > 0 ? "text-status-red" : "text-ink"}`}>{pendingPayments.length}</p>
          </Panel>
          <Panel>
            <p className="text-xs font-semibold uppercase text-ink-subtle">Necesitan revisión</p>
            <p className={`mt-1 text-2xl font-bold ${needsReview.length > 0 ? "text-amber-600" : "text-ink"}`}>{needsReview.length}</p>
          </Panel>
        </div>

        <Panel className="mb-5">
          <div className="mb-3">
            <h2 className="text-lg font-semibold text-ink">Resumen por Aeronave</h2>
            <p className="text-xs text-ink-subtle">
              Vista rápida por helicóptero. El detalle completo de cada póliza (cobertura, texto detectado, cumplimiento histórico) está
              más abajo, dentro de &ldquo;Ver detalle completo&rdquo;.
            </p>
          </div>
          <div className="hsv-table-wrap">
            <table className="hsv-table">
              <thead className="hsv-table-head">
                <tr>
                  <th className="hsv-table-th">Aeronave</th>
                  <th className="hsv-table-th">Asegurado</th>
                  <th className="hsv-table-th">Aseguradora</th>
                  <th className="hsv-table-th">Vigencia</th>
                  <th className="hsv-table-th">Próximo pago</th>
                  <th className="hsv-table-th">Piloto asignado actualmente</th>
                  <th className="hsv-table-th">Horas mínimas</th>
                  <th className="hsv-table-th">Estado</th>
                </tr>
              </thead>
              <tbody className="hsv-table-body">
                {helicopterSummaries.map(({ helicopter, policy, nextPayment, assignment, compliance, tone }) => {
                  const days = daysUntil(policy?.end_date ?? null);
                  const paymentDays = nextPayment ? daysUntil(nextPayment.due_date) : null;
                  return (
                    <tr key={helicopter.registration} className="hsv-table-row">
                      <td className="hsv-table-cell hsv-technical-value">
                        <Link className="font-semibold text-ink hover:text-aviation-teal" href={`/helicopters/${helicopter.registration}`}>
                          {helicopter.registration}
                        </Link>
                        <p className="text-xs font-normal text-ink-subtle">{helicopter.model}</p>
                      </td>
                      <td className="hsv-table-cell text-ink-muted">{policy?.insured_name || <span className="text-ink-subtle">—</span>}</td>
                      <td className="hsv-table-cell text-ink-muted">{policy?.insurer || "Sin póliza"}</td>
                      <td className="hsv-table-cell">
                        {policy?.end_date ? (
                          <span
                            className={
                              tone === "red" ? "font-semibold text-status-red" : tone === "amber" ? "font-semibold text-amber-600" : "text-ink-muted"
                            }
                          >
                            {policy.end_date}
                            {formatDays(days)}
                          </span>
                        ) : (
                          <span className="text-ink-subtle">—</span>
                        )}
                      </td>
                      <td className="hsv-table-cell text-ink-muted">
                        {nextPayment ? (
                          <>
                            ${Number(nextPayment.amount).toLocaleString("en-US")} {nextPayment.currency}
                            <p className="text-xs text-ink-subtle">
                              vence {nextPayment.due_date}
                              {formatDays(paymentDays)}
                            </p>
                          </>
                        ) : policy ? (
                          <span className="text-ink-subtle">Sin pagos pendientes</span>
                        ) : (
                          <span className="text-ink-subtle">—</span>
                        )}
                      </td>
                      <td className="hsv-table-cell text-ink-muted">
                        {assignment ? (
                          <>
                            {assignment.pilotName}
                            {assignment.campaignLabel ? <p className="text-xs text-ink-subtle">Faena {assignment.campaignLabel}</p> : null}
                          </>
                        ) : (
                          <span className="text-ink-subtle">Sin asignar</span>
                        )}
                      </td>
                      <td className="hsv-table-cell">
                        {policy?.min_pilot_hours_total == null ? (
                          <span className="text-xs text-ink-subtle">Sin requisito</span>
                        ) : !assignment ? (
                          <StatusPill tone="neutral">Sin piloto asignado</StatusPill>
                        ) : compliance ? (
                          <StatusPill tone={compliance.meetsTotal && compliance.meetsType ? "green" : "red"}>
                            {compliance.meetsTotal && compliance.meetsType ? "Cumple" : "No cumple"}
                          </StatusPill>
                        ) : (
                          <StatusPill tone="neutral">Sin datos de vuelo</StatusPill>
                        )}
                      </td>
                      <td className="hsv-table-cell">
                        <StatusPill tone={tone}>{!policy ? "Sin póliza" : tone === "red" ? "Atender" : tone === "amber" ? "Revisar" : "Al día"}</StatusPill>
                      </td>
                    </tr>
                  );
                })}
                {!helicopterSummaries.length ? (
                  <tr>
                    <td className="hsv-empty-state" colSpan={8}>
                      Registra primero un helicóptero en Flota para ver su resumen aquí.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel className="mb-5">
          <h2 className="mb-3 text-lg font-semibold text-ink">Subir póliza</h2>
          {helicopters.length ? (
            <PolicyUploadForm helicopters={helicopters} />
          ) : (
            <p className="text-sm text-ink-subtle">Registra primero un helicóptero en Flota.</p>
          )}
        </Panel>

        {error ? <div className="hsv-error-banner mb-5">No se pudo conectar con la base de datos: {error.message}.</div> : null}

        <h2 className="mb-3 text-lg font-semibold text-ink">Detalle completo por póliza</h2>
        <div className="grid gap-5">
          {policies.map((policy) => {
            const days = daysUntil(policy.end_date);
            const tone = dateTone(days);
            const textClass = tone === "red" ? "font-semibold text-status-red" : tone === "amber" ? "font-semibold text-amber-600" : "text-ink-muted";
            const policyPayments = paymentsByPolicy.get(policy.id) ?? [];
            const compliance = pilotComplianceFor(policy);
            const boundAddPayment = addPolicyPayment.bind(null, policy.id);
            const boundMarkReviewed = markRequirementsReviewed.bind(null, policy.id);
            const boundArchive = archivePolicy.bind(null, policy.id);

            return (
              <Panel key={policy.id}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="flex items-center gap-2 text-lg font-semibold text-ink">
                      {policy.helicopter_registration ? (
                        <Link className="hover:text-aviation-teal" href={`/helicopters/${policy.helicopter_registration}`}>
                          {policy.helicopter_registration}
                        </Link>
                      ) : (
                        "Sin helicóptero"
                      )}
                      <span className="text-ink-muted">— {policy.insurer || "Aseguradora sin definir"}</span>
                      {policy.attachment_placeholder ? (
                        <a
                          href={policy.attachment_placeholder}
                          target="_blank"
                          rel="noreferrer"
                          className="text-ink-subtle hover:text-aviation-teal"
                          title="Ver carátula/declaraciones"
                        >
                          <ExternalLink className="h-4 w-4" aria-hidden="true" />
                        </a>
                      ) : null}
                    </p>
                    <p className="mt-1 hsv-technical-value text-sm text-ink-muted">Póliza N° {policy.policy_number || "sin detectar"}</p>
                    {policy.insured_name ? (
                      <p className="mt-0.5 text-sm text-ink-muted">
                        <span className="text-xs font-semibold uppercase text-ink-subtle">Asegurado: </span>
                        {policy.insured_name}
                      </p>
                    ) : null}
                    {policy.anexo_url ? (
                      <a href={policy.anexo_url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs text-aviation-teal hover:underline">
                        Ver Anexo →
                      </a>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {!policy.requirements_reviewed ? (
                      <form action={boundMarkReviewed}>
                        <StatusPill tone="amber" className="cursor-default">
                          Pendiente revisión
                        </StatusPill>
                        <button className="hsv-ghost-button ml-2 !px-2 !py-1 text-xs" type="submit">
                          Marcar revisado
                        </button>
                      </form>
                    ) : (
                      <StatusPill tone="green">Revisado</StatusPill>
                    )}
                    {policy.attachment_placeholder ? <ReanalyzeButton policyId={policy.id} /> : null}
                    <Link className="hsv-secondary-button !px-2 !py-1 text-xs" href={`/policies/${policy.id}/edit`}>
                      Editar
                    </Link>
                    <form action={boundArchive}>
                      <button className="hsv-danger-button !px-2 !py-1 text-xs" type="submit">
                        Archivar
                      </button>
                    </form>
                  </div>
                </div>

                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-semibold text-aviation-teal hover:underline">
                    Ver detalle completo (cobertura, pagos, cumplimiento de pilotos)
                  </summary>

                <div className="mt-4 grid gap-3 sm:grid-cols-4">
                  <div>
                    <p className="text-xs font-semibold uppercase text-ink-subtle">Vigencia</p>
                    <p className={`text-sm ${textClass}`}>
                      {policy.start_date || "?"} a {policy.end_date || "?"}
                      {formatDays(days)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-ink-subtle">Prima</p>
                    <p className="text-sm text-ink-muted">
                      {policy.premium_amount != null ? `$${Number(policy.premium_amount).toLocaleString("en-US")} ${policy.currency}` : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-ink-subtle">Tipo de cobertura/operación</p>
                    {policy.coverage_type ? (
                      <ul className="mt-1 space-y-0.5">
                        {splitCoverageItems(policy.coverage_type).map((item, i) => (
                          <li key={i} className="text-sm text-ink-muted">
                            · {item}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-ink-muted">sin detectar</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-ink-subtle">Requisito de horas del piloto (más estricto)</p>
                    <p className="text-sm text-ink-muted">
                      {policy.min_pilot_hours_total != null ? `${policy.min_pilot_hours_total} hrs totales` : "sin detectar"}
                      {policy.min_pilot_hours_type != null ? ` · ${policy.min_pilot_hours_type} hrs en tipo` : ""}
                    </p>
                  </div>
                </div>

                {policy.pilot_requirements_detail?.length ? (
                  <div className="mt-3">
                    <p className="mb-2 text-xs font-semibold uppercase text-ink-subtle">Horas mínimas de piloto por tipo de operación</p>
                    <div className="hsv-table-wrap">
                      <table className="hsv-table">
                        <thead className="hsv-table-head">
                          <tr>
                            <th className="hsv-table-th">Operación</th>
                            <th className="hsv-table-th">Hrs totales (ala rotativa)</th>
                            <th className="hsv-table-th">Hrs en el modelo</th>
                            <th className="hsv-table-th">Hrs específicas</th>
                            <th className="hsv-table-th">Sin pérdidas</th>
                          </tr>
                        </thead>
                        <tbody className="hsv-table-body">
                          {policy.pilot_requirements_detail.map((block, i) => (
                            <tr key={i} className="hsv-table-row">
                              <td className="hsv-table-cell font-semibold text-ink">{block.operationType}</td>
                              <td className="hsv-table-cell hsv-technical-value">{block.minHoursTotal ?? "—"}</td>
                              <td className="hsv-table-cell hsv-technical-value">{block.minHoursOnType ?? "—"}</td>
                              <td className="hsv-table-cell hsv-technical-value">
                                {block.operationSpecificHours != null
                                  ? `${block.operationSpecificHours} hrs ${block.operationSpecificLabel ?? ""}${
                                      block.operationSpecificSubHours != null
                                        ? ` (${block.operationSpecificSubHours} hrs ${block.operationSpecificSubLabel ?? ""})`
                                        : ""
                                    }`
                                  : "—"}
                              </td>
                              <td className="hsv-table-cell text-ink-muted">{block.noLossesRequired ? "Sí" : "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : null}

                {policy.min_pilot_hours_total == null ? (
                  <div className="mt-3 rounded-md border border-aviation-amber/30 bg-aviation-amber/5 p-3">
                    <p className="text-xs text-ink-muted">
                      Sin horas mínimas del piloto porque esa cláusula está en el Anexo (documento separado, en inglés), no en la
                      carátula. Si ya lo tienes, súbelo aquí:
                    </p>
                    <div className="mt-2">
                      <AnexoUploadForm policyId={policy.id} hasAnexo={Boolean(policy.anexo_url)} />
                    </div>
                  </div>
                ) : (
                  <div className="mt-3">
                    <AnexoUploadForm policyId={policy.id} hasAnexo={Boolean(policy.anexo_url)} />
                  </div>
                )}

                {policy.requirements_summary ? (
                  <p className="mt-3 rounded-md border border-line bg-canvas-muted/40 p-3 text-xs leading-5 text-ink-subtle">
                    <span className="font-semibold text-ink-muted">Texto detectado sobre requisitos: </span>
                    {policy.requirements_summary}
                  </p>
                ) : null}

                {compliance.length ? (
                  <div className="mt-4">
                    <p className="text-xs font-semibold uppercase text-ink-subtle">Pilotos que han volado este helicóptero</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {compliance.map((c) => (
                        <StatusPill key={c.name} tone={c.meetsTotal && c.meetsType ? "green" : "red"}>
                          {c.name}: {c.totalHours.toFixed(0)} hrs {c.meetsTotal && c.meetsType ? "— cumple" : "— no cumple"}
                        </StatusPill>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="mt-4 border-t border-line pt-4">
                  <p className="mb-2 text-xs font-semibold uppercase text-ink-subtle">Calendario de pagos</p>
                  {policyPayments.length ? (
                    <div className="hsv-table-wrap">
                      <table className="hsv-table">
                        <thead className="hsv-table-head">
                          <tr>
                            <th className="hsv-table-th">Vence</th>
                            <th className="hsv-table-th">Monto</th>
                            <th className="hsv-table-th">Estado</th>
                            <th className="hsv-table-th"></th>
                          </tr>
                        </thead>
                        <tbody className="hsv-table-body">
                          {policyPayments.map((payment) => {
                            const paymentDays = daysUntil(payment.due_date);
                            const paymentTone = payment.status === "Paid" ? "green" : dateTone(paymentDays);
                            return (
                              <tr key={payment.id} className="hsv-table-row">
                                <td className="hsv-table-cell text-ink-muted">
                                  {payment.due_date}
                                  {payment.status !== "Paid" ? formatDays(paymentDays) : ""}
                                </td>
                                <td className="hsv-table-cell hsv-technical-value">
                                  ${Number(payment.amount).toLocaleString("en-US")} {payment.currency}
                                </td>
                                <td className="hsv-table-cell">
                                  <StatusPill tone={paymentTone === "red" ? "red" : paymentTone === "amber" ? "amber" : "green"}>
                                    {payment.status}
                                  </StatusPill>
                                </td>
                                <td className="hsv-table-cell">
                                  <PolicyPaymentActions paymentId={payment.id} status={payment.status} />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-ink-subtle">Sin pagos registrados todavía.</p>
                  )}

                  <form action={boundAddPayment} className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
                    <label className="grid gap-1 text-xs font-semibold text-ink">
                      Fecha de vencimiento
                      <input className="hsv-control" type="date" name="dueDate" required />
                    </label>
                    <label className="grid gap-1 text-xs font-semibold text-ink">
                      Monto
                      <input className="hsv-control" type="number" step="0.01" name="amount" required />
                    </label>
                    <label className="grid gap-1 text-xs font-semibold text-ink">
                      Nota (opcional)
                      <input className="hsv-control" type="text" name="notes" />
                    </label>
                    <button className="hsv-secondary-button" type="submit">
                      Agregar pago
                    </button>
                  </form>
                </div>
                </details>
              </Panel>
            );
          })}
          {!policies.length && !error ? (
            <Panel>
              <p className="hsv-empty-state">Todavía no hay pólizas cargadas — sube el PDF de la primera arriba.</p>
            </Panel>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}
