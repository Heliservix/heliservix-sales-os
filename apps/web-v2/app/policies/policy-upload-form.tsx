"use client";

import { useActionState, useState } from "react";
import { FileUp } from "lucide-react";
import { uploadPolicy, type UploadPolicyState } from "@/app/policies/actions";

type PolicyUploadFormProps = {
  helicopters: { registration: string; model: string }[];
};

const initialState: UploadPolicyState = {};

function formatDate(value: string | null): string {
  return value ?? "no detectada";
}

// Mirrors app/helicopters/photo-upload-form.tsx's useActionState pattern —
// the action returns a state object instead of throwing, so a real failure
// (missing bucket, missing column, PDF with no readable text) shows up as an
// actual message here instead of the form silently doing nothing.
export function PolicyUploadForm({ helicopters }: PolicyUploadFormProps) {
  const [helicopterRegistration, setHelicopterRegistration] = useState(helicopters[0]?.registration ?? "");
  const boundAction = uploadPolicy.bind(null, helicopterRegistration);
  const [state, formAction, isPending] = useActionState(boundAction, initialState);

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      <label className="grid gap-1.5 text-sm font-semibold text-ink">
        Helicóptero
        <select
          className="hsv-control"
          name="helicopterRegistration"
          value={helicopterRegistration}
          onChange={(event) => setHelicopterRegistration(event.target.value)}
        >
          {helicopters.map((h) => (
            <option key={h.registration} value={h.registration}>
              {h.registration} ({h.model})
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1.5 text-sm font-semibold text-ink">
        PDF de la póliza
        <input
          className="hsv-control file:mr-3 file:rounded-md file:border-0 file:bg-brand-lightBlue file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-aviation-blue"
          type="file"
          name="policyFile"
          accept="application/pdf"
          required
        />
      </label>
      <button className="hsv-primary-button" type="submit" disabled={isPending || !helicopterRegistration}>
        <FileUp className="h-4 w-4" aria-hidden="true" />
        {isPending ? "Analizando..." : "Subir póliza"}
      </button>

      {state.error ? <p className="sm:col-span-3 text-sm text-status-red">{state.error}</p> : null}
      {state.success && state.summary ? (
        <div className="sm:col-span-3 rounded-md border border-aviation-teal/25 bg-aviation-teal/5 p-3 text-sm text-ink">
          <p className="font-semibold text-aviation-teal">Póliza cargada. Esto detecté automáticamente — revísalo antes de confiar en los datos:</p>
          <ul className="mt-1.5 list-disc pl-5 text-ink-muted">
            <li>N° de póliza: {state.summary.policyNumber ?? "no detectado"}</li>
            <li>
              Vigencia: {formatDate(state.summary.startDate)} a {formatDate(state.summary.endDate)}
            </li>
            <li>Prima: {state.summary.premiumAmount != null ? `$${state.summary.premiumAmount.toLocaleString("en-US")}` : "no detectada"}</li>
            <li>Horas mínimas totales del piloto: {state.summary.minPilotHoursTotal ?? "no detectadas"}</li>
            <li>Horas mínimas en tipo: {state.summary.minPilotHoursType ?? "no detectadas"}</li>
          </ul>
        </div>
      ) : null}
    </form>
  );
}
