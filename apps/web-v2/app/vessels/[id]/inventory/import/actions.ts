"use server";

import { revalidatePath } from "next/cache";
import { parseInventoryWorkbook } from "@/lib/inventory-import";
import { syncVesselInventory } from "@/lib/inventory-sync";

export type InventoryImportState = {
  status: "idle" | "success" | "error";
  message: string;
  created?: number;
  updated?: number;
  warnings?: string[];
};

// Bound with the vessel id via .bind(null, vesselId) in the form action, same
// pattern as the other per-vessel/per-helicopter server actions in this app.
export async function importVesselInventory(vesselId: string, _prevState: InventoryImportState, formData: FormData): Promise<InventoryImportState> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "Selecciona el archivo Excel del inventario." };
  }

  let parsed;
  try {
    const arrayBuffer = await file.arrayBuffer();
    parsed = parseInventoryWorkbook(Buffer.from(arrayBuffer));
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return { status: "error", message: `No se pudo leer el archivo: ${detail}` };
  }

  const { rows, warnings } = parsed;
  if (rows.length === 0) {
    return { status: "error", message: "El archivo no tiene filas de inventario reconocibles.", warnings };
  }

  const { created, updated, warnings: syncWarnings } = await syncVesselInventory(vesselId, rows);

  revalidatePath(`/vessels/${vesselId}/inventory`);
  revalidatePath("/inventory");

  return {
    status: "success",
    message: `Listo. Se crearon ${created} ítem(s) nuevo(s) y se actualizaron ${updated} ítem(s) existentes.`,
    created,
    updated,
    warnings: [...warnings, ...syncWarnings]
  };
}
