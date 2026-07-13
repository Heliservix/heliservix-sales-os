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

function optionalHours(form: FormData, key: string) {
  const value = text(form, key);
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function createComplianceItem(formData: FormData) {
  const title = text(formData, "title");
  if (!title) throw new Error("El título es obligatorio.");
  const relatedHelicopterRaw = text(formData, "relatedHelicopter");

  const { error } = await supabase.from("compliance_items").insert({
    authority: text(formData, "authority") || "Other",
    compliance_type: text(formData, "complianceType") || "AD",
    reference_number: optionalText(formData, "referenceNumber"),
    title,
    effective_date: optionalText(formData, "effectiveDate"),
    due_date: optionalText(formData, "dueDate"),
    due_hours: optionalHours(formData, "dueHours"),
    applicability: optionalText(formData, "applicability"),
    related_helicopter: relatedHelicopterRaw ? normalizeRegistration(relatedHelicopterRaw) : null,
    status: text(formData, "status") || "Not reviewed",
    notes: optionalText(formData, "notes"),
    attachment_placeholder: optionalText(formData, "attachmentUrl"),
    source: "User"
  });

  if (error) throw new Error(error.message);

  revalidatePath("/compliance");
  redirect("/compliance");
}

export async function updateComplianceItem(id: string, formData: FormData) {
  const title = text(formData, "title");
  if (!title) throw new Error("El título es obligatorio.");
  const relatedHelicopterRaw = text(formData, "relatedHelicopter");

  const { error } = await supabase
    .from("compliance_items")
    .update({
      authority: text(formData, "authority") || "Other",
      compliance_type: text(formData, "complianceType") || "AD",
      reference_number: optionalText(formData, "referenceNumber"),
      title,
      effective_date: optionalText(formData, "effectiveDate"),
      due_date: optionalText(formData, "dueDate"),
      due_hours: optionalHours(formData, "dueHours"),
      applicability: optionalText(formData, "applicability"),
      related_helicopter: relatedHelicopterRaw ? normalizeRegistration(relatedHelicopterRaw) : null,
      status: text(formData, "status") || "Not reviewed",
      notes: optionalText(formData, "notes"),
      attachment_placeholder: optionalText(formData, "attachmentUrl"),
      updated_at: new Date().toISOString()
    })
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/compliance");
  redirect("/compliance");
}

export async function archiveComplianceItem(id: string) {
  const { error } = await supabase.from("compliance_items").update({ archived: true }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/compliance");
  redirect("/compliance");
}
