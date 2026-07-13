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

function normalizeRegistration(value: string) {
  return value.replace(/[-\s]/g, "").toUpperCase();
}

export async function createTechnicalRecord(formData: FormData) {
  const title = text(formData, "title");
  if (!title) throw new Error("El título del registro es obligatorio.");

  const relatedHelicopterRaw = text(formData, "relatedHelicopter");

  const { error } = await supabase.from("technical_records").insert({
    record_type: text(formData, "recordType") || "Other",
    related_helicopter: relatedHelicopterRaw ? normalizeRegistration(relatedHelicopterRaw) : null,
    title,
    record_date: optionalText(formData, "recordDate"),
    document_number: optionalText(formData, "documentNumber"),
    notes: optionalText(formData, "notes"),
    source: "User"
  });

  if (error) throw new Error(error.message);

  revalidatePath("/technical-records");
  redirect("/technical-records");
}

export async function archiveTechnicalRecord(id: string) {
  const { error } = await supabase.from("technical_records").update({ archived: true }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/technical-records");
}
