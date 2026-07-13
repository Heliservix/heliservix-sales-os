"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";

const VALID_STATUSES = ["Open", "Acknowledged", "In Progress", "Resolved"] as const;

export async function updateAlertStatus(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");

  if (!id) throw new Error("Missing alert id.");
  if (!VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) {
    throw new Error("Invalid status.");
  }

  const { error } = await supabase.from("maintenance_alerts").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/alerts");
  revalidatePath("/");
}
