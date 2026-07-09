"use client";

import { useActionState, useRef } from "react";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import { importComponentControl, type ImportState } from "@/app/helicopters/import/actions";

const initialState: ImportState = { status: "idle", message: "" };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button className="hsv-primary-button" type="submit" disabled={pending}>
      {pending ? "Procesando archivo…" : "Importar componentes"}
    </button>
  );
}

export function ImportForm() {
  const [state, formAction] = useActionState(importComponentControl, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="grid gap-5">
      <form
        ref={formRef}
        action={(formData) => {
          formAction(formData);
        }}
        className="grid gap-4"
      >
        <label className="grid gap-1.5 text-sm font-semibold text-ink">
          Archivo Excel del Control Maestro
          <input className="hsv-control" type="file" name="file" accept=".xlsx,.xls" required />
        </label>
        <p className="text-sm text-ink-muted">
          Acepta el archivo tal como lo entregan los mecánicos: hoja &ldquo;Control Maestro&rdquo;, matrícula y
          horómetro en el bloque superior, tabla de componentes debajo. Si el helicóptero ya existe,
          los componentes se actualizan por P/N + S/N — no se duplican.
        </p>
        <div>
          <SubmitButton />
        </div>
      </form>

      {state.status === "success" && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <p className="font-semibold">{state.message}</p>
          {state.registration && (
            <p className="mt-2">
              <Link className="underline" href={`/helicopters/${state.registration}`}>
                Ver {state.registration} →
              </Link>
            </p>
          )}
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
