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

export async function createPurchaseRequest(formData: FormData) {
  const itemName = text(formData, "itemName");
  if (!itemName) throw new Error("El nombre del ítem es obligatorio.");

  const { error } = await supabase.from("purchase_requests").insert({
    supplier: text(formData, "supplier") || "Pendiente de asignar",
    item_name: itemName,
    part_number: optionalText(formData, "partNumber"),
    quantity: number(formData, "quantity") || 1,
    unit_cost: number(formData, "unitCost"),
    currency: text(formData, "currency") || "USD",
    related_helicopter: optionalText(formData, "relatedHelicopter"),
    related_vessel_id: optionalText(formData, "relatedVesselId"),
    related_maintenance_event: optionalText(formData, "relatedMaintenanceEvent"),
    status: text(formData, "status") || "Requested",
    notes: optionalText(formData, "notes"),
    source: "User"
  });

  if (error) throw new Error(error.message);

  revalidatePath("/purchasing");
  redirect("/purchasing");
}

export async function updatePurchaseRequestStatus(id: string, formData: FormData) {
  const status = text(formData, "status");
  if (!status) throw new Error("Selecciona un estado.");

  const { error } = await supabase.from("purchase_requests").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/purchasing");
  revalidatePath("/aura");
}

export async function archivePurchaseRequest(id: string) {
  const { error } = await supabase.from("purchase_requests").update({ archived: true }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/purchasing");
}
