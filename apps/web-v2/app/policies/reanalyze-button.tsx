"use client";

import { RefreshCw } from "lucide-react";
import { reanalyzePolicy } from "@/app/policies/actions";

export function ReanalyzeButton({ policyId }: { policyId: string }) {
  const boundReanalyze = reanalyzePolicy.bind(null, policyId);

  return (
    <form
      action={boundReanalyze}
      onSubmit={(event) => {
        if (!window.confirm("Esto vuelve a leer el PDF ya guardado y reemplaza los datos detectados automáticamente (N° de póliza, vigencia, prima, tipo de cobertura, horas del piloto). Si ya corregiste algo a mano en Editar, se perderá. ¿Continuar?")) {
          event.preventDefault();
        }
      }}
    >
      <button className="hsv-ghost-button !px-2 !py-1 text-xs" type="submit" title="Vuelve a leer el PDF ya guardado con el analizador actualizado">
        <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
        Reanalizar
      </button>
    </form>
  );
}
