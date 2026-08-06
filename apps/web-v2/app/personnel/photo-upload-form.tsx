"use client";

import { useActionState } from "react";
import { Camera } from "lucide-react";
import { uploadPersonnelPhoto, type UploadPersonnelPhotoState } from "@/app/personnel/actions";

type PersonnelPhotoUploadFormProps = {
  personnelId: string;
  kind: "photo" | "passport";
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
      {state.success ? <p className="text-[11px] text-status-green">Foto actualizada.</p> : null}
    </form>
  );
}
