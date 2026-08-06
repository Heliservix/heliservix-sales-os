"use client";

import { useActionState } from "react";
import { FileUp } from "lucide-react";
import { attachPolicyAnexo, type AttachAnexoState } from "@/app/policies/actions";

const initialState: AttachAnexoState = {};

// A real policy is two PDFs (see app/policies/actions.ts's
// attachPolicyAnexo comment): the declarations page uploaded via
// PolicyUploadForm, and this — the separate English Anexo that actually
// has the pilot-hours requirement. Same useActionState pattern as the
// other upload forms in this module.
export function AnexoUploadForm({ policyId, hasAnexo }: { policyId: string; hasAnexo: boolean }) {
  const boundAction = attachPolicyAnexo.bind(null, policyId);
  const [state, formAction, isPending] = useActionState(boundAction, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <label className="grid gap-1 text-xs font-semibold text-ink">
        {hasAnexo ? "Reemplazar Anexo" : "Agregar Anexo (horas de piloto)"}
        <input
          className="w-56 text-[11px] text-ink-subtle file:mr-2 file:rounded-md file:border-0 file:bg-brand-lightBlue file:px-2 file:py-1 file:text-[11px] file:font-semibold file:text-aviation-blue"
          type="file"
          name="anexoFile"
          accept="application/pdf"
          required
        />
      </label>
      <button className="hsv-ghost-button !px-2 !py-1 text-xs" type="submit" disabled={isPending}>
        <FileUp className="h-3.5 w-3.5" aria-hidden="true" />
        {isPending ? "Analizando..." : "Subir Anexo"}
      </button>
      {state.error ? <p className="w-full text-[11px] text-status-red">{state.error}</p> : null}
      {state.success ? (
        <p className="w-full text-[11px] text-status-green">
          Anexo agregado — horas: {state.summary?.minPilotHoursTotal ?? "no detectadas"}
          {state.summary?.minPilotHoursType != null ? ` (${state.summary.minPilotHoursType} en tipo)` : ""}.
        </p>
      ) : null}
    </form>
  );
}
