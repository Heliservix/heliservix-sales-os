"use client";

import { useActionState } from "react";
import { UploadCloud } from "lucide-react";
import { uploadAircraftDocument, type UploadAircraftDocumentState } from "@/app/helicopters/[registration]/documents/actions";

type DocumentUploadFormProps = {
  registration: string;
  category: "Certificados" | "Bitacoras" | "Facturas";
  showAmount?: boolean;
};

const initialState: UploadAircraftDocumentState = {};

// Un solo formulario reutilizado por Certificados, Bitácoras y Facturas —
// las tres son la misma biblioteca genérica (aircraft_documents), solo
// cambia la categoría que se le pasa via bind. showAmount solo se activa
// para Facturas (monto + proveedor no aplican a un certificado o bitácora).
export function DocumentUploadForm({ registration, category, showAmount }: DocumentUploadFormProps) {
  const boundAction = uploadAircraftDocument.bind(null, registration, category);
  const [state, formAction, isPending] = useActionState(boundAction, initialState);

  return (
    <form action={formAction} encType="multipart/form-data" className="grid gap-3 sm:grid-cols-2">
      <label className="grid gap-1 text-xs font-semibold text-ink sm:col-span-2">
        Título / nombre del documento
        <input className="hsv-control" name="title" required placeholder="Ej. Certificado de Aeronavegabilidad" />
      </label>
      <label className="grid gap-1 text-xs font-semibold text-ink">
        N° de documento (opcional)
        <input className="hsv-control" name="documentNumber" />
      </label>
      {showAmount ? (
        <>
          <label className="grid gap-1 text-xs font-semibold text-ink">
            Proveedor
            <input className="hsv-control" name="vendor" />
          </label>
          <label className="grid gap-1 text-xs font-semibold text-ink">
            Monto
            <input className="hsv-control" type="number" step="0.01" name="amount" />
          </label>
        </>
      ) : null}
      <label className="grid gap-1 text-xs font-semibold text-ink">
        Fecha del documento
        <input className="hsv-control" type="date" name="issueDate" />
      </label>
      <label className="grid gap-1 text-xs font-semibold text-ink">
        Fecha de vencimiento (si aplica)
        <input className="hsv-control" type="date" name="expiryDate" />
      </label>
      <label className="grid gap-1 text-xs font-semibold text-ink sm:col-span-2">
        Archivo (PDF o imagen)
        <input className="hsv-control" type="file" name="file" accept="application/pdf,image/*" />
      </label>
      <label className="grid gap-1 text-xs font-semibold text-ink sm:col-span-2">
        Notas
        <input className="hsv-control" name="notes" />
      </label>
      <div className="sm:col-span-2">
        <button type="submit" disabled={isPending} className="hsv-secondary-button">
          <UploadCloud className="h-4 w-4" aria-hidden="true" />
          {isPending ? "Guardando..." : "Agregar documento"}
        </button>
        {state.error ? <p className="mt-1 text-xs text-status-red">{state.error}</p> : null}
        {state.success ? <p className="mt-1 text-xs text-status-green">Documento guardado.</p> : null}
      </div>
    </form>
  );
}
