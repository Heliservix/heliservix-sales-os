"use client";

import { useActionState } from "react";
import { Camera } from "lucide-react";
import { uploadPersonnelPhoto, type UploadPersonnelPhotoState } from "@/app/personnel/actions";

type PersonnelPhotoUploadFormProps = {
  personnelId: string;
  kind: "photo" | "passport" | "seaman-book";
  hasPhoto: boolean;
  label: string;
};

const initialState: UploadPersonnelPhotoState = {};

// Same pattern as app/helicopters/photo-upload-form.tsx — the action
// returns state instead of throwing, so a missing bucket/column shows a
// real message instead of the button silently doing nothing.
export function PersonnelPhotoUploadForm({ personnelId, kind, hasPhoto, label }: PersonnelPhotoUploadFormProps) {
  const boundAction = uploadPersonnelPhoto.bind(null, personnelId, kind);
  const [state, formAction, isPending] = useActionState(boundAction, initialState);

  return (
    <form action={formAction} className="flex flex-col items-start gap-1.5">
      <span className="text-xs font-semibold text-ink-subtle">{label}</span>
      <input
        type="file"
        name="photo"
        accept="image/*"
        required
        className="w-48 text-[11px] text-ink-subtle file:mr-2 file:rounded-md file:border-0 file:bg-brand-lightBlue file:px-2 file:py-1 file:text-[11px] file:font-semibold file:text-aviation-blue"
      />
      <button type="submit" disabled={isPending} className="hsv-ghost-button -ml-2.5 text-xs">
        <Camera className="h-3.5 w-3.5" aria-hidden="true" />
        {isPending ? "Subiendo..." : hasPhoto ? "Cambiar foto" : "Subir foto"}
      </button>
      {state.error ? <p className="max-w-[220px] text-[11px] text-status-red">{state.error}</p> : null}
      {state.success && kind !== "seaman-book" ? <p className="text-[11px] text-status-green">Foto actualizada.</p> : null}
      {state.success && kind === "seaman-book" ? (
        <div className="max-w-[220px] rounded-md border border-line bg-canvas-muted/40 p-2 text-[11px] leading-4 text-ink-subtle">
          <p className="font-semibold text-status-green">Foto guardada.</p>
          {state.extracted ? (
            <>
              <p className="mt-1">N°: {state.extracted.documentNumber ?? "no detectado"}</p>
              <p>Emisión: {state.extracted.issueDate ?? "no detectada"}</p>
              <p>Vencimiento: {state.extracted.expiryDate ?? "no detectado"}</p>
              {state.extracted.fullNameOnDocument ? <p>Nombre en el documento: {state.extracted.fullNameOnDocument}</p> : null}
              <p className="mt-1 text-ink-subtle">Revisa estos datos en el formulario de abajo antes de guardar.</p>
            </>
          ) : null}
          {state.extractionWarning ? <p className="mt-1 text-aviation-amber">{state.extractionWarning}</p> : null}
        </div>
      ) : null}
    </form>
  );
}
