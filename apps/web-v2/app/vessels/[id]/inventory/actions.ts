"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";

function text(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function optionalText(form: FormData, key: string) {
  const value = text(form, key);
  return value || null;
}

function number(form: FormData, key: string) {
  const value = Number(form.get(key));
  return Number.isFinite(value) ? value : 0;
}

function optionalDate(form: FormData, key: string) {
  const value = text(form, key);
  return value || null;
}

export async function createInventoryItem(vesselId: string, formData: FormData) {
  const itemName = text(formData, "itemName");
  if (!itemName) throw new Error("El nombre del ítem es obligatorio.");

  const { error } = await supabase.from("inventory_items").insert({
    vessel_id: vesselId,
    item_name: itemName,
    item_type: text(formData, "itemType") || "Other",
    part_number: optionalText(formData, "partNumber"),
    serial_number: optionalText(formData, "serialNumber"),
    lot_batch: optionalText(formData, "lotBatch"),
    quantity: number(formData, "quantity"),
    unit_of_measure: text(formData, "unitOfMeasure") || "ea",
    minimum_stock: number(formData, "minimumStock"),
    storage_location: optionalText(formData, "storageLocation"),
    condition: optionalText(formData, "condition"),
    expiration_date: optionalDate(formData, "expirationDate"),
    related_helicopter: optionalText(formData, "relatedHelicopter"),
    notes: optionalText(formData, "notes"),
    source: "User"
  });

  if (error) throw new Error(error.message);

  revalidatePath(`/vessels/${vesselId}/inventory`);
  redirect(`/vessels/${vesselId}/inventory`);
}

export async function updateInventoryItem(vesselId: string, itemId: string, formData: FormData) {
  const itemName = text(formData, "itemName");
  if (!itemName) throw new Error("El nombre del ítem es obligatorio.");

  const { error } = await supabase
    .from("inventory_items")
    .update({
      item_name: itemName,
      item_type: text(formData, "itemType") || "Other",
      part_number: optionalText(formData, "partNumber"),
      serial_number: optionalText(formData, "serialNumber"),
      lot_batch: optionalText(formData, "lotBatch"),
      unit_of_measure: text(formData, "unitOfMeasure") || "ea",
      minimum_stock: number(formData, "minimumStock"),
      storage_location: optionalText(formData, "storageLocation"),
      condition: optionalText(formData, "condition"),
      expiration_date: optionalDate(formData, "expirationDate"),
      related_helicopter: optionalText(formData, "relatedHelicopter"),
      notes: optionalText(formData, "notes")
      // quantity is intentionally NOT editable here — it's only ever changed
      // via stock_movements (recordStockMovement below), so there's always an
      // audit trail of why the number moved.
    })
    .eq("id", itemId);

  if (error) throw new Error(error.message);

  revalidatePath(`/vessels/${vesselId}/inventory`);
  redirect(`/vessels/${vesselId}/inventory`);
}

export async function archiveInventoryItem(vesselId: string, itemId: string) {
  const { error } = await supabase.from("inventory_items").update({ archived: true }).eq("id", itemId);
  if (error) throw new Error(error.message);
  revalidatePath(`/vessels/${vesselId}/inventory`);
  redirect(`/vessels/${vesselId}/inventory`);
}

export async function deleteInventoryItem(vesselId: string, itemId: string) {
  const { error } = await supabase.from("inventory_items").delete().eq("id", itemId);
  if (error) throw new Error(error.message);
  revalidatePath(`/vessels/${vesselId}/inventory`);
  redirect(`/vessels/${vesselId}/inventory`);
}

/** Records a stock movement — trg_apply_stock_movement adjusts inventory_items.quantity automatically. */
export async function recordStockMovement(vesselId: string, formData: FormData) {
  const inventoryItemId = text(formData, "inventoryItemId");
  const movementType = text(formData, "movementType");
  const quantity = number(formData, "quantity");

  if (!inventoryItemId) throw new Error("Selecciona un ítem.");
  if (quantity <= 0) throw new Error("La cantidad debe ser mayor a cero.");

  const { error } = await supabase.from("stock_movements").insert({
    inventory_item_id: inventoryItemId,
    movement_type: movementType || "Adjusted",
    quantity,
    movement_date: text(formData, "movementDate") || new Date().toISOString().slice(0, 10),
    related_maintenance_event: optionalText(formData, "relatedMaintenanceEvent"),
    notes: optionalText(formData, "notes"),
    source: "User"
  });

  if (error) throw new Error(error.message);

  revalidatePath(`/vessels/${vesselId}/inventory`);
}
