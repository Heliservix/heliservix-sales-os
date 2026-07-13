"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="hsv-secondary-button print:hidden">
      <Printer className="h-4 w-4" aria-hidden="true" />
      Imprimir / Guardar como PDF
    </button>
  );
}
