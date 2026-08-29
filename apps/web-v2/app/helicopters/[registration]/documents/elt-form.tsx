"use client";

import { useActionState } from "react";
import { Save } from "lucide-react";
import { upsertEltStatus, type UpsertEltState } from "@/app/helicopters/[registration]/documents/actions";
import type { AircraftEltRow } from "@/lib/document-center";

type EltFormProps = {
  registration: string;
  elt: AircraftEltRow | null;
};

const initialState: UpsertEltState = {};

export function EltForm({ registration, elt }: EltFormProps) {
  const boundAction = upsertEltStatus.bind(null, registration);
  const [state, formAction, isPending] = useActionState(boundAction, initialState);

  return (
    <form action={formAction} encType="multipart/form-data" className="grid gap-3 sm:grid-cols-2">
      <label className="grid gap-1 text-xs font-semibold text-ink">
        Fabricante
        <input className="hsv-control" name="manufacturer" defaultValue={elt?.manufacturer ?? ""} placeholder="Ej. Artex, Kannad" />
      </label>
      <label className="grid gap-1 text-xs font-semibold text-ink">
        Modelo
        <input className="hsv-control" name="model" defaultValue={elt?.model ?? ""} />
      </label>
      <label className="grid gap-1 text-xs font-semibold text-ink">
        N° de serie
        <input className="hsv-control" name="serialNumber" defaultValue={elt?.serial_number ?? ""} />
      </label>
      <label className="grid gap-1 text-xs font-semibold text-ink">
        Vencimiento de batería
        <input className="hsv-control" type="date" name="batteryExpiryDate" defaultValue={elt?.battery_expiry_date ?? ""} />
      </label>
      <label className="grid gap-1 text-xs font-semibold text-ink">
        Última inspección
        <input className="hsv-control" type="date" name="lastInspectionDate" defaultValue={elt?.last_inspection_date ?? ""} />
      </label>
      <label className="grid gap-1 text-xs font-semibold text-ink">
        Próxima inspección
        <input className="hsv-control" type="date" name="nextInspectionDate" defaultValue={elt?.next_inspection_date ?? ""} />
      </label>
      <label className="grid gap-1 text-xs font-semibold text-ink sm:col-span-2">
        Certificado / documento (PDF o imagen)
        <input className="hsv-control" type="file" name="certificate" accept="application/pdf,image/*" />
        {elt?.certificate_url ? (
          <a href={elt.certificate_url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs text-aviation-teal hover:underline">
            Ver certificado actual →
          </a>
        ) : null}
      </label>
      <label className="grid gap-1 text-xs font-semibold text-ink sm:col-span-2">
        Notas
        <input className="hsv-control" name="notes" defaultValue={elt?.notes ?? ""} />
      </label>
      <div className="sm:col-span-2">
        <button type="submit" disabled={isPending} className="hsv-secondary-button">
          <Save className="h-4 w-4" aria-hidden="true" />
          {isPending ? "Guardando..." : "Guardar ELT"}
        </button>
        {state.error ? <p className="mt-1 text-xs text-status-red">{state.error}</p> : null}
        {state.success ? <p className="mt-1 text-xs text-status-green">ELT actualizado.</p> : null}
      </div>
    </form>
  );
}
