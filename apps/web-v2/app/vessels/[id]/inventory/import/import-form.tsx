"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import type { InventoryImportState } from "@/app/vessels/[id]/inventory/import/actions";

const initialState: InventoryImportState = { status: "idle", message: "" };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button className="hsv-primary-button" type="submit" disabled={pending}>
      {pending ? "Procesando archivo…" : "Cargar inventario"}
    </button>
  );
}

type InventoryImportFormProps = {
  vesselId: string;
  action: (prevState: InventoryImportState, formData: FormData) => Promise<InventoryImportState>;
};

export function InventoryImportForm({ vesselId, action }: InventoryImportFormProps) {
  const [state, formAction] = useActionState(action, initialState);

  return (
    <div className="grid gap-5">
      <form action={formAction} className="grid gap-4">
        <label className="grid gap-1.5 text-sm font-semibold text-ink">
          Archivo Excel del inventario
          <input className="hsv-control" type="file" name="file" accept=".xlsx,.xls" required />
        </label>
        <p className="text-sm text-ink-muted">
          Usa la plantilla exportada desde la bodega (botón &ldquo;Exportar&rdquo;). Los ítems se identifican por P/N — si no
          tiene P/N, por nombre. Los que ya existen en esta bodega se actualizan (cantidad, mínimo, ubicación, etc.); los que
          no existen se crean.
        </p>
        <div>
          <SubmitButton />
        </div>
      </form>

      {state.status === "success" && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <p className="font-semibold">{state.message}</p>
          <p className="mt-2">
            <Link className="underline" href={`/vessels/${vesselId}/inventory`}>
              Ver bodega →
            </Link>
          </p>
          {state.warnings && state.warnings.length > 0 && (
            <ul className="mt-3 list-disc pl-5 text-emerald-800">
              {state.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {state.status === "error" && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <p className="font-semibold">{state.message}</p>
          {state.warnings && state.warnings.length > 0 && (
            <ul className="mt-3 list-disc pl-5 text-red-800">
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
