"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { parseInventoryWorkbook } from "@/lib/inventory-import";

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

  // This is a bulk load/reconciliation (initial count or periodic recount),
  // so it sets quantity directly rather than going through stock_movements —
  // day-to-day changes (Recibido/Usado/Instalado/etc.) still go through
  // movements on the inventory page and via the weekly report importer,
  // which keep their own audit trail. Matched by P/N first (most reliable),
  // falling back to item name, both scoped to this vessel; no match creates
  // a new item.
  let created = 0;
  let updated = 0;
  const rowWarnings: string[] = [];

  for (const row of rows) {
    let existingId: string | null = null;

    if (row.partNumber) {
      const { data: match } = await supabase
        .from("inventory_items")
        .select("id")
        .eq("vessel_id", vesselId)
        .eq("archived", false)
        .ilike("part_number", row.partNumber)
        .maybeSingle();
      existingId = match?.id ?? null;
    }
    if (!existingId) {
      const { data: match } = await supabase
        .from("inventory_items")
        .select("id")
        .eq("vessel_id", vesselId)
        .eq("archived", false)
        .ilike("item_name", row.itemName)
        .maybeSingle();
      existingId = match?.id ?? null;
    }

    const payload = {
      item_name: row.itemName,
      item_type: row.itemType,
      part_number: row.partNumber || null,
      serial_number: row.serialNumber || null,
      lot_batch: row.lotBatch || null,
      quantity: row.quantity,
      unit_of_measure: row.unitOfMeasure,
      minimum_stock: row.minimumStock,
      storage_location: row.storageLocation || null,
      condition: row.condition || null,
      expiration_date: row.expirationDate,
      related_helicopter: row.relatedHelicopter || null,
      notes: row.notes || null
    };

    if (existingId) {
      const { error } = await supabase
        .from("inventory_items")
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq("id", existingId);
      if (error) {
        rowWarnings.push(`No se pudo actualizar "${row.itemName}": ${error.message}`);
        continue;
      }
      updated += 1;
    } else {
      const { error } = await supabase.from("inventory_items").insert({ ...payload, vessel_id: vesselId, source: "User" });
      if (error) {
        rowWarnings.push(`No se pudo crear "${row.itemName}": ${error.message}`);
        continue;
      }
      created += 1;
    }
  }

  revalidatePath(`/vessels/${vesselId}/inventory`);
  revalidatePath("/inventory");

  return {
    status: "success",
    message: `Listo. Se crearon ${created} ítem(s) nuevo(s) y se actualizaron ${updated} ítem(s) existentes.`,
    created,
    updated,
    warnings: [...warnings, ...rowWarnings]
  };
}
