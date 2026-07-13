import { supabase } from "@/lib/supabase";
import type { ParsedInventoryRow } from "@/lib/inventory-import";

// Shared by both the standalone "Cargar Excel" button on a vessel's bodega
// page and the automatic weekly-report import (when the workbook includes an
// "INVENTARIO BODEGA" sheet). This is a bulk count/reconciliation, not an
// incremental movement: it sets quantity directly from the sheet rather than
// going through stock_movements, because the sheet represents "this is what's
// physically in the bodega right now," not "this changed by N." Day-to-day
// changes (Recibido/Usado/Instalado/etc., manual or from CONSUMO MATERIALES)
// still go through movements and keep their own audit trail.
export async function syncVesselInventory(
  vesselId: string,
  rows: ParsedInventoryRow[]
): Promise<{ created: number; updated: number; warnings: string[] }> {
  let created = 0;
  let updated = 0;
  const warnings: string[] = [];

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
        warnings.push(`No se pudo actualizar "${row.itemName}": ${error.message}`);
        continue;
      }
      updated += 1;
    } else {
      const { error } = await supabase.from("inventory_items").insert({ ...payload, vessel_id: vesselId, source: "User" });
      if (error) {
        warnings.push(`No se pudo crear "${row.itemName}": ${error.message}`);
        continue;
      }
      created += 1;
    }
  }

  return { created, updated, warnings };
}
