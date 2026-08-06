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
//
// Helicopters are checkboxes, not a single dropdown: real Anexo documents
// from Adolfo's insurer cover several aircraft in one PDF with one shared
// set of terms, so uploading once and checking every aircraft it applies to
// avoids having to re-upload the exact same file 5 times.
export function PolicyUploadForm({ helicopters }: PolicyUploadFormProps) {
  const [selected, setSelected] = useState<string[]>(helicopters[0] ? [helicopters[0].registration] : []);
  const boundAction = uploadPolicy.bind(null, selected);
  const [state, formAction, isPending] = useActionState(boundAction, initialState);

  function toggle(registration: string) {
    setSelected((prev) => (prev.includes(registration) ? prev.filter((r) => r !== registration) : [...prev, registration]));
  }

  return (
    <form action={formAction} className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-[2fr_1fr_auto] sm:items-start">
        <div className="grid gap-1.5 text-sm font-semibold text-ink">
          Helicóptero(s) que cubre esta póliza
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 rounded-md border border-ink-muted/20 p-2.5">
            {helicopters.map((h) => (
              <label key={h.registration} className="flex items-center gap-1.5 text-sm font-normal text-ink">
                <input type="checkbox" checked={selected.includes(h.registration)} onChange={() => toggle(h.registration)} />
                {h.registration} ({h.model})
              </label>
            ))}
          </div>
          <span className="text-xs font-normal text-ink-muted">
            Si el PDF es un anexo que cubre varias aeronaves (mismo texto de requisitos para todas), marca todas — se sube el archivo
            una sola vez.
          </span>
        </div>
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
        <button className="hsv-primary-button sm:mt-6" type="submit" disabled={isPending || selected.length === 0}>
          <FileUp className="h-4 w-4" aria-hidden="true" />
          {isPending ? "Analizando..." : "Subir póliza"}
        </button>
      </div>

      {state.error ? <p className="text-sm text-status-red">{state.error}</p> : null}
      {state.success && state.summary ? (
        <div className="rounded-md border border-aviation-teal/25 bg-aviation-teal/5 p-3 text-sm text-ink">
          <p className="font-semibold text-aviation-teal">Póliza cargada. Esto detecté automáticamente — revísalo antes de confiar en los datos:</p>
          <ul className="mt-1.5 list-disc pl-5 text-ink-muted">
            <li>N° de póliza: {state.summary.policyNumber ?? "no detectado"}</li>
            <li>Tipo de cobertura/operación: {state.summary.coverageType ?? "no detectado"}</li>
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
