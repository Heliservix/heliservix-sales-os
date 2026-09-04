import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { buildFaenaAuthorization, type AuthorizationTranche } from "@/lib/faena-authorization";
import type { CompanyProfileId } from "@/lib/company-profiles";
import { PrintButton } from "@/app/reports/faena/[id]/print-button";

export const dynamic = "force-dynamic";

type FaenaAuthorizationPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tranche?: string; issuer?: string }>;
};

function paramsWith(id: string, tranche: string, issuer: string) {
  return `/reports/faena-authorization/${id}?tranche=${tranche}&issuer=${issuer}`;
}

export default async function FaenaAuthorizationPage({ params, searchParams }: FaenaAuthorizationPageProps) {
  const { id } = await params;
  const { tranche: trancheParam, issuer: issuerParam } = await searchParams;
  const tranche: AuthorizationTranche = trancheParam === "20" ? "20" : "80";
  const issuerId: CompanyProfileId = issuerParam === "heliservix" ? "heliservix" : "pacific";

  const auth = await buildFaenaAuthorization(id, tranche, issuerId);
  if (!auth) notFound();

  return (
    <div className="min-h-screen bg-canvas-muted px-4 py-8 print:bg-white print:px-0 print:py-0">
      {/* Fuerza una sola página carta al imprimir/guardar como PDF, con
          márgenes ajustados para que quepan la carta y el cuadro juntos. */}
      <style>{`
        @page { size: letter; margin: 11mm 14mm; }
        @media print {
          html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
      <div className="mx-auto max-w-3xl">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Link href={`/campaigns/${id}`} className="hsv-ghost-button -ml-2.5">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Volver a la faena
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase text-ink-subtle">Emitir como:</span>
            <Link
              href={paramsWith(id, tranche, "pacific")}
              className={`hsv-secondary-button ${issuerId === "pacific" ? "!border-aviation-teal !text-aviation-teal" : ""}`}
            >
              Pacific Helicopter Supplies
            </Link>
            <Link
              href={paramsWith(id, tranche, "heliservix")}
              className={`hsv-secondary-button ${issuerId === "heliservix" ? "!border-aviation-teal !text-aviation-teal" : ""}`}
            >
              HeliServiX
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={paramsWith(id, "80", issuerId)}
              className={`hsv-secondary-button ${tranche === "80" ? "!border-aviation-teal !text-aviation-teal" : ""}`}
            >
              Ver 80%
            </Link>
            <Link
              href={paramsWith(id, "20", issuerId)}
              className={`hsv-secondary-button ${tranche === "20" ? "!border-aviation-teal !text-aviation-teal" : ""}`}
            >
              Ver 20%
            </Link>
            <PrintButton />
          </div>
        </div>

        {auth.missingData ? <div className="hsv-error-banner print:hidden">{auth.missingData}</div> : null}

        {/* Documento de una sola página: carta de solicitud de fondos + cuadro
            de pago, en un solo panel compacto para imprimir/guardar como PDF. */}
        <div className="hsv-panel print:border-none print:p-0 print:shadow-none">
          <div className="flex items-start gap-3 print:gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={auth.issuer.logoSrc} alt={auth.issuer.legalName} className="h-14 w-auto object-contain print:h-12" />
            <div>
              <p className="text-lg font-semibold uppercase leading-tight text-ink print:text-base">{auth.issuer.legalName}</p>
              {auth.issuer.ruc ? <p className="text-xs text-ink-subtle">RUC {auth.issuer.ruc}</p> : null}
              {auth.issuer.addressLines.map((line, i) => (
                <p key={i} className="text-xs text-ink-subtle">
                  {line}
                </p>
              ))}
              <p className="text-xs text-ink-subtle">{auth.issuer.phones.join(" · ")}</p>
            </div>
          </div>

          <p className="mt-4 text-sm text-ink print:mt-3">Panamá, {auth.dateLine}.</p>

          <p className="mt-4 text-sm text-ink print:mt-3">Para: Departamento de Tesorería / Nóminas</p>
          <p className="mt-0.5 text-sm font-semibold text-ink">{auth.addressee.companyName}</p>
          <p className="mt-1 text-sm text-ink">
            Ref. Solicitud de Fondos — Pago {auth.tranche}% {auth.campaignCode ? `Marea ${auth.campaignCode}` : auth.campaignName}.
          </p>

          <p className="mt-4 text-sm font-semibold text-ink print:mt-3">M/N {auth.vesselName}:</p>

          <p className="mt-3 text-sm leading-6 text-ink print:mt-2 print:leading-5">
            Por medio de la presente, y conforme a la autorización de pago del {auth.tranche}% ya otorgada, solicitamos a su
            Departamento de Tesorería/Nóminas gestionar el desembolso de los fondos correspondientes al pago de piloto y mecánico
            de la {auth.campaignCode ? `Marea ${auth.campaignCode}` : auth.campaignName} de la M/N {auth.vesselName}, calculado
            sobre{" "}
            <strong>
              {auth.tranche === "80"
                ? auth.tonsEstimate != null
                  ? `${auth.tonsEstimate} Toneladas APROXIMADAS.`
                  : "— Toneladas APROXIMADAS."
                : auth.tonsFinal != null
                  ? `${auth.tonsFinal} Toneladas Finales.`
                  : "— Toneladas Finales."}
            </strong>{" "}
            {auth.dischargePort ? `Descarga realizada en ${auth.dischargePort}.` : null}
          </p>

          <p className="mt-2 text-sm leading-6 text-ink print:leading-5">
            {auth.tranche === "80" ? (
              <>
                {auth.tonsEstimate ?? "—"} Toneladas Aproximadas × 80% ={" "}
                <strong>{auth.tonsToPayThisTranche != null ? auth.tonsToPayThisTranche.toFixed(0) : "—"} Toneladas a Pagar.</strong>
              </>
            ) : (
              <>
                {auth.tonsFinal ?? "—"} Toneladas Finales, menos {auth.tonsAlreadyPaidIn80 != null ? auth.tonsAlreadyPaidIn80.toFixed(0) : "—"}{" "}
                Toneladas pagadas en el 80% ={" "}
                <strong>{auth.tonsToPayThisTranche != null ? auth.tonsToPayThisTranche.toFixed(0) : "—"} Toneladas a Pagar.</strong>
              </>
            )}
          </p>

          <p className="mt-3 text-sm text-ink print:mt-2">
            El detalle del cálculo por persona (días laborados, bono por tonelada y anticipos) se muestra en el cuadro a continuación.
            Agradecemos gestionar el envío de los fondos a la brevedad posible.
          </p>

          {/* Cuadro de pago por persona — reemplaza el Excel, integrado en la misma carta */}
          <div className="mt-4 print:mt-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">
              Cuadro de pago — {auth.tranche}% {auth.campaignCode ? `Marea ${auth.campaignCode}` : auth.campaignName}
            </p>
            {auth.people.length ? (
              <table className="mt-2 w-full border-collapse text-left text-xs print:text-[11px]">
                <thead>
                  <tr className="border-b border-t border-ink/30">
                    <th className="py-1.5 pr-2 font-semibold text-ink-subtle">Nombre</th>
                    <th className="py-1.5 pr-2 font-semibold text-ink-subtle">Cargo</th>
                    <th className="py-1.5 pr-2 font-semibold text-ink-subtle">Descripción</th>
                    <th className="py-1.5 pr-2 text-right font-semibold text-ink-subtle">Monto</th>
                    <th className="py-1.5 pr-2 text-right font-semibold text-ink-subtle">Anticipo</th>
                    <th className="py-1.5 text-right font-semibold text-ink-subtle">A pagar</th>
                  </tr>
                </thead>
                <tbody>
                  {auth.people.map((person) =>
                    person.lineItems.map((item, i) => (
                      <tr key={`${person.role}-${i}`} className="border-b border-line align-top">
                        {i === 0 ? (
                          <>
                            <td className="py-1.5 pr-2 font-semibold text-ink" rowSpan={person.lineItems.length}>
                              {person.name}
                            </td>
                            <td className="py-1.5 pr-2 text-ink-muted" rowSpan={person.lineItems.length}>
                              {person.role}
                            </td>
                          </>
                        ) : null}
                        <td className="py-1.5 pr-2 text-ink-muted">{item.label}</td>
                        <td className="py-1.5 pr-2 text-right hsv-technical-value">{item.amount != null ? `$${item.amount.toFixed(2)}` : "—"}</td>
                        {i === 0 ? (
                          <>
                            <td className="py-1.5 pr-2 text-right hsv-technical-value" rowSpan={person.lineItems.length}>
                              {person.anticipo ? `$${person.anticipo.toFixed(2)}` : "—"}
                            </td>
                            <td className="py-1.5 text-right hsv-technical-value font-semibold text-ink" rowSpan={person.lineItems.length}>
                              {person.totalToPay != null ? `$${person.totalToPay.toFixed(2)}` : "—"}
                            </td>
                          </>
                        ) : null}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            ) : (
              <p className="mt-2 text-sm text-ink-subtle">No hay piloto/mecánico asignado con datos de salario en Personal.</p>
            )}
            {auth.totalToPayAllPeople != null ? (
              <p className="mt-2 text-right text-sm font-semibold text-ink">
                Total a pagar ({auth.tranche}%): ${auth.totalToPayAllPeople.toFixed(2)}
              </p>
            ) : null}
          </div>

          <div className="mt-8 text-sm text-ink print:mt-6">
            <p>Atentamente por,</p>
            <p className="mt-1.5 font-semibold uppercase">{auth.issuer.legalName}</p>
            <div className="mt-6 max-w-xs border-t border-ink pt-1 print:mt-5">
              <p className="font-semibold text-ink">{auth.issuer.signerName}</p>
              <p className="text-xs text-ink-subtle">{auth.issuer.signerTitle}</p>
            </div>
            <p className="mt-3 text-[11px] uppercase text-ink-subtle">
              {auth.issuer.legalName}
              <br />
              M/N {auth.vesselName}
            </p>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-ink-subtle print:hidden">
          Generado automáticamente por HeliServiX OS a partir de datos reales de la faena y del personal, bajo gestión de{" "}
          {auth.issuer.signerName}. Verifica los montos antes de enviar.
        </p>
      </div>
    </div>
  );
}
