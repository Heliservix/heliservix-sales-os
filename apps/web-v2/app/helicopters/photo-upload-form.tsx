"use client";

import { useActionState } from "react";
import { Camera } from "lucide-react";
import { uploadHelicopterPhoto, type UploadPhotoState } from "@/app/helicopters/actions";

type PhotoUploadFormProps = {
  registration: string;
  hasPhoto: boolean;
};

const initialState: UploadPhotoState = {};

/** Client component wrapper around uploadHelicopterPhoto so the form can
 * actually show what happened — success, or a specific reason it failed
 * (wrong file type, file too large, or a SQL migration that hasn't been run
 * yet in Supabase). Before this, the plain server-action form gave no
 * feedback at all if anything went wrong, which just looked like "nothing
 * happens" when clicking "Subir foto." */
export function PhotoUploadForm({ registration, hasPhoto }: PhotoUploadFormProps) {
  const boundAction = uploadHelicopterPhoto.bind(null, registration);
  const [state, formAction, isPending] = useActionState(boundAction, initialState);

  return (
    <form action={formAction} className="flex flex-col items-center gap-1.5 xl:items-start">
      <input
        type="file"
        name="photo"
        accept="image/*"
        required
        className="w-40 text-[11px] text-ink-subtle file:mr-2 file:rounded-md file:border-0 file:bg-brand-lightBlue file:px-2 file:py-1 file:text-[11px] file:font-semibold file:text-aviation-blue"
      />
      <button type="submit" disabled={isPending} className="hsv-ghost-button -ml-2.5 text-xs">
        <Camera className="h-3.5 w-3.5" aria-hidden="true" />
        {isPending ? "Subiendo..." : hasPhoto ? "Cambiar foto" : "Subir foto"}
      </button>
      {state.error ? <p className="max-w-[220px] text-center text-[11px] text-status-red xl:text-left">{state.error}</p> : null}
      {state.success ? <p className="text-[11px] text-status-green">Foto actualizada.</p> : null}
    </form>
  );
}
