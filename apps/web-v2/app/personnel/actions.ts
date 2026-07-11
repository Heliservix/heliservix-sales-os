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
  const value = text(form, key);
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function createPersonnel(formData: FormData) {
  const fullName = text(formData, "fullName");
  if (!fullName) throw new Error("El nombre es obligatorio.");

  const { error } = await supabase.from("personnel").insert({
    full_name: fullName,
    role: text(formData, "role") || "Piloto",
    monthly_salary: optionalNumber(formData, "monthlySalary"),
    rate_per_ton: optionalNumber(formData, "ratePerTon"),
    phone: optionalText(formData, "phone"),
    notes: optionalText(formData, "notes"),
    status: text(formData, "status") || "Active",
    source: "User"
  });

  if (error) throw new Error(error.message);

  revalidatePath("/personnel");
  redirect("/personnel");
}

export async function updatePersonnel(id: string, formData: FormData) {
  const fullName = text(formData, "fullName");
  if (!fullName) throw new Error("El nombre es obligatorio.");

  const { error } = await supabase
    .from("personnel")
    .update({
      full_name: fullName,
      role: text(formData, "role") || "Piloto",
      monthly_salary: optionalNumber(formData, "monthlySalary"),
      rate_per_ton: optionalNumber(formData, "ratePerTon"),
      phone: optionalText(formData, "phone"),
      notes: optionalText(formData, "notes"),
      status: text(formData, "status") || "Active",
      updated_at: new Date().toISOString()
    })
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/personnel");
  redirect("/personnel");
}

export async function archivePersonnel(id: string) {
  const { error } = await supabase.from("personnel").update({ archived: true }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/personnel");
  redirect("/personnel");
}
