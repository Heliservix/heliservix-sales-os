import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { buildFaenaAuthorization, type AuthorizationTranche } from "@/lib/faena-authorization";
import { PrintButton } from "@/app/reports/faena/[id]/print-button";

export const dynamic = "force-dynamic";

type FaenaAuthorizationPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tranche?: string }>;
};

export default async function FaenaAuthorizationPage({ params, searchParams }: FaenaAuthorizationPageProps) {
  const { id } = await params;
  const { tranche: trancheParam } = await searchParams;
  const tranche: AuthorizationTranche = trancheParam === "20" ? "20" : "80";

  const auth = await buildFaenaAuthorization(id, tranche);
  if (!auth) notFound();

  return (
    <div className="min-h-screen bg-canvas-muted px-4 py-8 print:bg-white print:px-0 print:py-0">
      <div className="mx-auto max-w-3xl">
        <div className="mb-5 flex items-center justify-between print:hidden">
          <Link href={`/campaigns/${id}`} className="hsv-ghost-button -ml-2.5">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Volver a la faena
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href={`/reports/faena-authorization/${id}?tranche=80`}
              className={`hsv-secondary-button ${tranche === "80" ? "!border-aviation-teal !text-aviation-teal" : ""}`}
            >
              Ver 80%
            </Link>
            <Link
              href={`/reports/faena-authorization/${id}?tranche=20`}
              className={`hsv-secondary-button ${tranche === "20" ? "!border-aviation-teal !text-aviation-teal" : ""}`}
            >
              Ver 20%
            </Link>
            <PrintButton />
          </div>
        </div>

        {auth.missingData ? (
          <div className="hsv-error-banner print:hidden">{auth.missingData}</div>
        ) : null}

        {/* Carta de autorización — imita el formato real que ya usa Adolfo */}
        <div className="hsv-panel print:border-none print:shadow-none">
          <p className="text-2xl font-semibold uppercase text-ink">{auth.letterhead.companyName}</p>
          {auth.letterhead.address ? (
            <p className="mt-1 whitespace-pre-line text-xs leading-5 text-ink-subtle">{auth.letterhead.address}</p>
          ) : null}

          <p className="mt-6 text-sm text-ink">
            {auth.letterhead.city}, {auth.dateLine}.
          </p>

          <p className="mt-6 text-sm text-ink">Para: Departamento de Nóminas</p>
          <p className="mt-1 text-sm text-ink">De Señores: {auth.letterhead.signers || "—"}</p>
          <p className="mt-1 text-sm text-ink">
            Ref. Autorización de Pago {auth.tranche}% {auth.campaignCode ? `Marea ${auth.campaignCode}` : auth.campaignName}.
          </p>

          <p className="mt-6 text-sm font-semibold text-ink">M/N {auth.vesselName}:</p>

          <p className="mt-6 text-sm leading-6 text-ink">
            Por medio de la presente autorizamos pagar el {auth.tranche}% de la {auth.campaignCode ? `Marea ${auth.campaignCode}` : auth.campaignName}{" "}
            de la M/N {auth.vesselName} con{" "}
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

          <p className="mt-3 text-sm leading-6 text-ink">
            {auth.tranche === "80" ? (
              <>
                {auth.tonsEstimate ?? "—"} Toneladas Aproximadas * 80% ={" "}
                <strong>{auth.tonsToPayThisTranche != null ? auth.tonsToPayThisTranche.toFixed(0) : "—"} Toneladas a Pagar.</strong>
              </>
            ) : (
              <>
                {auth.tonsFinal ?? "—"} Toneladas Finales, menos {auth.tonsAlreadyPaidIn80 != null ? auth.tonsAlreadyPaidIn80.toFixed(0) : "—"} Toneladas
                pagadas en el 80% ={" "}
                <strong>{auth.tonsToPayThisTranche != null ? auth.tonsToPayThisTranche.toFixed(0) : "—"} Toneladas a Pagar.</strong>
              </>
            )}
          </p>

          <p className="mt-6 text-sm text-ink">Agradecemos tomar nota.</p>

          <div className="mt-16 text-sm text-ink">
            <p>Atentamente por,</p>
            <p className="mt-2 font-semibold">{auth.letterhead.companyName}</p>
            <div className="mt-10 max-w-xs border-t border-ink pt-1">
              <p className="text-xs text-ink-subtle">{auth.letterhead.signers || ""}</p>
            </div>
            <p className="mt-4 text-xs uppercase text-ink-subtle">
              {auth.letterhead.companyName}
              <br />
              M/N {auth.vesselName}
            </p>
          </div>
        </div>

        {/* Cuadro de pago por persona — reemplaza el Excel */}
        <div className="hsv-panel mt-5 print:border-line">
          <h2 className="text-lg font-semibold text-ink">
            Cuadro de pago — {auth.tranche}% {auth.campaignCode ? `Marea ${auth.campaignCode}` : auth.campaignName}
          </h2>
          {auth.people.length ? (
            <div className="hsv-table-wrap mt-4">
              <table className="hsv-table">
                <thead className="hsv-table-head">
                  <tr>
                    <th className="hsv-table-th">Nombre</th>
                    <th className="hsv-table-th">Cargo</th>
                    <th className="hsv-table-th">Descripción</th>
                    <th className="hsv-table-th">Monto</th>
                    <th className="hsv-table-th">Anticipo</th>
                    <th className="hsv-table-th">A pagar</th>
                  </tr>
                </thead>
                <tbody className="hsv-table-body">
                  {auth.people.map((person) =>
                    person.lineItems.map((item, i) => (
                      <tr key={`${person.role}-${i}`} className="hsv-table-row align-top">
                        {i === 0 ? (
                          <>
                            <td className="hsv-table-cell font-semibold text-ink" rowSpan={person.lineItems.length}>
                              {person.name}
                            </td>
                            <td className="hsv-table-cell text-ink-muted" rowSpan={person.lineItems.length}>
                              {person.role}
                            </td>
                          </>
                        ) : null}
                        <td className="hsv-table-cell text-ink-muted">{item.label}</td>
                        <td className="hsv-table-cell hsv-technical-value">{item.amount != null ? `$${item.amount.toFixed(2)}` : "—"}</td>
                        {i === 0 ? (
                          <>
                            <td className="hsv-table-cell hsv-technical-value" rowSpan={person.lineItems.length}>
                              {person.anticipo ? `$${person.anticipo.toFixed(2)}` : "—"}
                            </td>
                            <td className="hsv-table-cell hsv-technical-value font-semibold text-ink" rowSpan={person.lineItems.length}>
                              {person.totalToPay != null ? `$${person.totalToPay.toFixed(2)}` : "—"}
                            </td>
                          </>
                        ) : null}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-3 text-sm text-ink-subtle">No hay piloto/mecánico asignado con datos de salario en Personal.</p>
          )}
          {auth.totalToPayAllPeople != null ? (
            <p className="mt-4 text-sm font-semibold text-ink">Total a pagar ({auth.tranche}%): ${auth.totalToPayAllPeople.toFixed(2)}</p>
          ) : null}
        </div>

        <p className="mt-5 text-center text-xs text-ink-subtle print:mt-8">
          Generado automáticamente por HeliServiX OS a partir de datos reales de la faena y del personal. Verifica los montos antes de enviar.
        </p>
      </div>
    </div>
  );
}
