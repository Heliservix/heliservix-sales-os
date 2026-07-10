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

function optionalNumber(form: FormData, key: string) {
  const raw = text(form, key);
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

export async function createVessel(formData: FormData) {
  const name = text(formData, "name");
  if (!name) throw new Error("El nombre del barco es obligatorio.");

  const { data, error } = await supabase
    .from("vessels")
    .insert({
      name,
      owner: optionalText(formData, "owner"),
      country: optionalText(formData, "country"),
      home_port: optionalText(formData, "homePort"),
      capacity_tons: optionalNumber(formData, "capacityTons"),
      status: text(formData, "status") || "Prospect",
      notes: optionalText(formData, "notes")
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/vessels");
  redirect(`/vessels/${data.id}`);
}

export async function updateVessel(id: string, formData: FormData) {
  const name = text(formData, "name");
  if (!name) throw new Error("El nombre del barco es obligatorio.");

  const { error } = await supabase
    .from("vessels")
    .update({
      name,
      owner: optionalText(formData, "owner"),
      country: optionalText(formData, "country"),
      home_port: optionalText(formData, "homePort"),
      capacity_tons: optionalNumber(formData, "capacityTons"),
      status: text(formData, "status") || "Prospect",
      notes: optionalText(formData, "notes")
    })
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/vessels");
  revalidatePath(`/vessels/${id}`);
  redirect(`/vessels/${id}`);
}

export async function archiveVessel(id: string) {
  const { error } = await supabase.from("vessels").update({ archived: true }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/vessels");
}

export async function deleteVessel(id: string) {
  // Helicopters referencing this vessel get unassigned automatically
  // (assigned_vessel_id references vessels(id) on delete set null).
  const { error } = await supabase.from("vessels").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/vessels");
  revalidatePath("/helicopters");
  redirect("/vessels");
}
