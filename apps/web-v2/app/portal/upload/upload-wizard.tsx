"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { CheckCircle2, ChevronLeft } from "lucide-react";
import { submitTechnicianWeeklyReport } from "@/app/portal/upload/actions";
import type { WeeklyImportState } from "@/app/reports/import/actions";

type AssignedCampaign = {
  id: string;
  name: string;
  code: string | null;
  status: string;
  vessels: { name: string } | null;
};

const initialState: WeeklyImportState = { status: "idle", message: "" };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button className="hsv-primary-button w-full justify-center" type="submit" disabled={pending}>
      {pending ? "Subiendo y procesando…" : "Subir reporte"}
    </button>
  );
}

export function UploadWizard({
  campaigns,
  technicianName
}: {
  campaigns: AssignedCampaign[];
  technicianName: string;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedCampaign, setSelectedCampaign] = useState<AssignedCampaign | null>(
    campaigns.length === 1 ? campaigns[0] : null
  );
  const [state, formAction] = useActionState(submitTechnicianWeeklyReport, initialState);

  if (state.status === "success") {
    return (
      <div className="hsv-panel text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-aviation-green" aria-hidden="true" />
        <p className="mt-3 text-lg font-semibold text-ink">¡Listo, {technicianName}!</p>
        <p className="mt-2 text-sm text-ink-subtle">{state.message}</p>
        <p className="mt-4 text-xs text-ink-subtle">Adolfo ya recibió un aviso de que subiste este reporte.</p>
        <a href="/portal" className="hsv-secondary-button mx-auto mt-6 w-full max-w-xs justify-center">
          Volver al inicio
        </a>
      </div>
    );
  }

  // Step 1 — pick which faena this report belongs to.
  if (step === 1) {
    return (
      <div className="hsv-panel">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">Paso 1 de 2</p>
        <h2 className="mt-1 text-lg font-semibold text-ink">¿En cuál faena estás trabajando?</h2>
        <div className="mt-4 grid gap-2.5">
          {campaigns.map((campaign) => (
            <button
              key={campaign.id}
              type="button"
              onClick={() => setSelectedCampaign(campaign)}
              className={`rounded-lg border px-4 py-3 text-left transition ${
                selectedCampaign?.id === campaign.id
                  ? "border-aviation-blue bg-brand-lightBlue/40"
                  : "border-line bg-white hover:border-aviation-blue/40"
              }`}
            >
              <p className="font-semibold text-ink">{campaign.name}</p>
              <p className="text-xs text-ink-subtle">
                {campaign.vessels?.name ?? "Sin barco"} · {campaign.status}
              </p>
            </button>
          ))}
        </div>
        <button
          type="button"
          disabled={!selectedCampaign}
          onClick={() => setStep(2)}
          className="hsv-primary-button mt-6 w-full justify-center"
        >
          Continuar
        </button>
      </div>
    );
  }

  // Step 2 — upload the file for the chosen faena.
  return (
    <div className="hsv-panel">
      <button
        type="button"
        onClick={() => setStep(1)}
        className="hsv-ghost-button -ml-2.5 mb-2"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        Cambiar faena
      </button>
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">Paso 2 de 2</p>
      <h2 className="mt-1 text-lg font-semibold text-ink">Sube el archivo de {selectedCampaign?.name}</h2>
      <p className="mt-1 text-sm text-ink-subtle">El mismo Excel de siempre, sin cambiarle nada.</p>

      <form action={formAction} className="mt-5 grid gap-4">
        <input type="hidden" name="campaignId" value={selectedCampaign?.id ?? ""} />
        <label className="grid gap-1.5 text-sm font-semibold text-ink">
          Archivo del reporte semanal
          <input className="hsv-control" type="file" name="file" accept=".xlsx,.xls" required />
        </label>
        <SubmitButton />
      </form>

      {state.status === "error" && (
        <div className="hsv-error-banner mt-4">
          {state.message}
          {state.warnings && state.warnings.length > 0 && (
            <ul className="mt-2 list-disc pl-5 font-normal">
              {state.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
