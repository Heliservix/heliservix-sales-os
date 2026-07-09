"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import { importWeeklyReport, type WeeklyImportState } from "@/app/reports/import/actions";

const initialState: WeeklyImportState = { status: "idle", message: "" };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button className="hsv-primary-button" type="submit" disabled={pending}>
      {pending ? "Procesando reporte…" : "Importar reporte semanal"}
    </button>
  );
}

export function WeeklyImportForm() {
  const [state, formAction] = useActionState(importWeeklyReport, initialState);

  return (
    <div className="grid gap-5">
      <form action={formAction} className="grid gap-4">
        <label className="grid gap-1.5 text-sm font-semibold text-ink">
          Archivo Excel del reporte semanal
          <input className="hsv-control" type="file" name="file" accept=".xlsx,.xls" required />
        </label>
        <p className="text-sm text-ink-muted">
          Acepta el archivo tal como lo entregan los mecánicos: hojas &ldquo;INFORME SEMANAL&rdquo;, &ldquo;NO RUTINAS&rdquo; y
          &ldquo;CAMBIO FILTROS&rdquo;. El helicóptero debe existir ya en el sistema. Las horas de la semana se
          descuentan automáticamente de todos sus componentes activos.
        </p>
        <div>
          <SubmitButton />
        </div>
      </form>

      {state.status === "success" && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <p className="font-semibold">{state.message}</p>
          {state.maintenanceLogsCreated != null && (
            <p className="mt-2">Se registraron {state.maintenanceLogsCreated} eventos de mantenimiento.</p>
          )}
          {state.registration && (
            <p className="mt-2">
              <Link className="underline" href={`/helicopters/${state.registration}`}>
                Ver {state.registration} →
              </Link>
            </p>
          )}
          {state.componentChangesReview && state.componentChangesReview.length > 0 && (
            <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-900">
              <p className="font-semibold">Posibles cambios de componentes detectados — revisar manualmente:</p>
              <ul className="mt-2 list-disc pl-5">
                {state.componentChangesReview.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
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
