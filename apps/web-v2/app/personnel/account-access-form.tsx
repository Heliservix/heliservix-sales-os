"use client";

import { useActionState } from "react";
import { KeyRound } from "lucide-react";
import { createTechnicianAccount, type CreateTechnicianAccountState } from "@/app/personnel/actions";

type AccountAccessFormProps = {
  personnelId: string;
  hasEmail: boolean;
  isActive: boolean;
  alreadyInvited: boolean;
};

const initialState: CreateTechnicianAccountState = {};

// Same useActionState pattern as PersonnelPhotoUploadForm — no props/args
// beyond personnelId, so this binds cleanly with .bind(null, personnelId).
export function AccountAccessForm({ personnelId, hasEmail, isActive, alreadyInvited }: AccountAccessFormProps) {
  const boundAction = createTechnicianAccount.bind(null, personnelId);
  const [state, formAction, isPending] = useActionState(boundAction, initialState);

  if (!isActive) {
    return <p className="text-xs text-ink-subtle">Solo las personas con estado Activo pueden tener acceso al sistema.</p>;
  }
  if (!hasEmail) {
    return <p className="text-xs text-ink-subtle">Escribe y guarda un correo arriba antes de crear su acceso — ese correo será su usuario.</p>;
  }

  return (
    <form action={formAction} className="grid gap-2">
      <button type="submit" disabled={isPending} className="hsv-secondary-button w-fit">
        <KeyRound className="h-4 w-4" aria-hidden="true" />
        {isPending ? "Creando..." : alreadyInvited ? "Crear acceso de nuevo (nueva contraseña)" : "Crear acceso al sistema"}
      </button>
      <p className="text-[11px] text-ink-subtle">
        Se crea una cuenta y se le envía por correo una contraseña temporal — nadie más la ve, ni siquiera tú.
      </p>
      {state.error ? <p className="text-[11px] text-status-red">{state.error}</p> : null}
      {state.success ? <p className="text-[11px] text-status-green">Cuenta creada. Le llegó un correo con su usuario y contraseña.</p> : null}
    </form>
  );
}
