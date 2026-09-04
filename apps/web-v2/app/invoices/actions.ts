"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { extractInvoiceWithClaude } from "@/lib/invoice-extraction";

const INVOICES_BUCKET = "aircraft-documents"; // reutiliza el bucket público ya existente, prefijo "invoices/"

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

// Sube el archivo + crea la factura + intenta leerla con IA en una sola
// acción — si la IA falla o no está configurada, la factura queda guardada
// igual (Failed) con el archivo archivado, para que Adolfo complete los
// ítems a mano en la página de revisión en vez de perder la subida.
export async function uploadInvoice(formData: FormData) {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("Selecciona el archivo de la factura (foto o PDF).");
  if (file.size > 15 * 1024 * 1024) throw new Error("El archivo pesa más de 15 MB — usa una versión más liviana.");

  const campaignId = optionalText(formData, "campaignId");
  const vesselId = optionalText(formData, "vesselId");
  const helicopterRegistration = optionalText(formData, "helicopterRegistration");

  const path = `invoices/${Date.now()}-${file.name}`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error: uploadError } = await supabase.storage.from(INVOICES_BUCKET).upload(path, bytes, { contentType: file.type, upsert: true });
  if (uploadError) throw new Error(`No se pudo subir el archivo: ${uploadError.message}`);
  const {
    data: { publicUrl: fileUrl }
  } = supabase.storage.from(INVOICES_BUCKET).getPublicUrl(path);

  const { data: invoice, error: insertError } = await supabase
    .from("invoices")
    .insert({
      campaign_id: campaignId,
      vessel_id: vesselId,
      helicopter_registration: helicopterRegistration,
      file_url: fileUrl,
      extraction_status: "Pending",
      source: "User"
    })
    .select("id")
    .single();
  if (insertError) throw new Error(insertError.message);

  const extraction = await extractInvoiceWithClaude(bytes, file.type || "application/octet-stream");

  if (extraction.ok) {
    await supabase
      .from("invoices")
      .update({
        vendor: extraction.data.vendor,
        invoice_number: extraction.data.invoiceNumber,
        invoice_date: extraction.data.invoiceDate,
        currency: extraction.data.currency,
        total_amount: extraction.data.totalAmount,
        extraction_status: "Extracted",
        ai_notes: extraction.notes,
        updated_at: new Date().toISOString()
      })
      .eq("id", invoice.id);

    if (extraction.data.lineItems.length) {
      await supabase.from("invoice_line_items").insert(
        extraction.data.lineItems.map((item) => ({
          invoice_id: invoice.id,
          item_name: item.itemName,
          part_number: item.partNumber,
          quantity: item.quantity,
          unit_cost: item.unitCost,
          line_total: item.unitCost != null ? item.unitCost * item.quantity : null
        }))
      );
    }
  } else {
    await supabase
      .from("invoices")
      .update({ extraction_status: "Failed", ai_notes: extraction.error, updated_at: new Date().toISOString() })
      .eq("id", invoice.id);
  }

  revalidatePath("/invoices");
  if (campaignId) revalidatePath(`/campaigns/${campaignId}`);
  redirect(`/invoices/${invoice.id}`);
}

export async function updateInvoiceHeader(id: string, formData: FormData) {
  const { error } = await supabase
    .from("invoices")
    .update({
      vendor: optionalText(formData, "vendor"),
      invoice_number: optionalText(formData, "invoiceNumber"),
      invoice_date: optionalText(formData, "invoiceDate"),
      currency: text(formData, "currency") || "USD",
      total_amount: optionalNumber(formData, "totalAmount"),
      notes: optionalText(formData, "notes"),
      updated_at: new Date().toISOString()
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/invoices/${id}`);
}

export async function addInvoiceLineItem(invoiceId: string, formData: FormData) {
  const itemName = text(formData, "itemName");
  if (!itemName) throw new Error("El nombre del ítem es obligatorio.");
  const quantity = optionalNumber(formData, "quantity") ?? 1;
  const unitCost = optionalNumber(formData, "unitCost");

  const { error } = await supabase.from("invoice_line_items").insert({
    invoice_id: invoiceId,
    item_name: itemName,
    part_number: optionalText(formData, "partNumber"),
    quantity,
    unit_cost: unitCost,
    line_total: unitCost != null ? unitCost * quantity : null
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/invoices/${invoiceId}`);
}

export async function updateInvoiceLineItem(invoiceId: string, lineItemId: string, formData: FormData) {
  const itemName = text(formData, "itemName");
  if (!itemName) throw new Error("El nombre del ítem es obligatorio.");
  const quantity = optionalNumber(formData, "quantity") ?? 1;
  const unitCost = optionalNumber(formData, "unitCost");

  const { error } = await supabase
    .from("invoice_line_items")
    .update({
      item_name: itemName,
      part_number: optionalText(formData, "partNumber"),
      quantity,
      unit_cost: unitCost,
      line_total: unitCost != null ? unitCost * quantity : null
    })
    .eq("id", lineItemId);
  if (error) throw new Error(error.message);
  revalidatePath(`/invoices/${invoiceId}`);
}

export async function deleteInvoiceLineItem(invoiceId: string, lineItemId: string) {
  const { error } = await supabase.from("invoice_line_items").delete().eq("id", lineItemId);
  if (error) throw new Error(error.message);
  revalidatePath(`/invoices/${invoiceId}`);
}

// Confirmar = aplicar cada línea al inventario: sube stock (trigger
// automático al insertar stock_movements) y actualiza el costo promedio
// ponderado del ítem — solo se hace UNA vez, al confirmar, para no duplicar
// stock si Adolfo revisa la página varias veces antes de confirmar.
export async function confirmInvoice(invoiceId: string) {
  const { data: invoice } = await supabase.from("invoices").select("*").eq("id", invoiceId).maybeSingle();
  if (!invoice) throw new Error("Factura no encontrada.");
  if (invoice.extraction_status === "Reviewed") return; // ya aplicada, no duplicar

  const { data: lineItems } = await supabase.from("invoice_line_items").select("*").eq("invoice_id", invoiceId);

  let campaignCode: string | null = null;
  if (invoice.campaign_id) {
    const { data: campaign } = await supabase.from("campaigns").select("code").eq("id", invoice.campaign_id).maybeSingle();
    campaignCode = campaign?.code ?? null;
  }

  for (const line of lineItems ?? []) {
    if (!line.quantity || line.quantity <= 0) continue;

    let matched: { id: string; quantity: number; unit_cost: number | null } | null = null;
    if (line.part_number) {
      const { data } = await supabase
        .from("inventory_items")
        .select("id, quantity, unit_cost")
        .eq("part_number", line.part_number)
        .eq("archived", false)
        .limit(1)
        .maybeSingle();
      matched = data;
    }
    if (!matched) {
      let query = supabase.from("inventory_items").select("id, quantity, unit_cost").ilike("item_name", line.item_name).eq("archived", false);
      if (invoice.vessel_id) query = query.eq("vessel_id", invoice.vessel_id);
      const { data } = await query.limit(1).maybeSingle();
      matched = data;
    }

    let inventoryItemId: string;
    if (matched) {
      inventoryItemId = matched.id;
      if (line.unit_cost != null) {
        const existingQty = Number(matched.quantity) || 0;
        const existingCost = matched.unit_cost != null ? Number(matched.unit_cost) : null;
        const newQty = Number(line.quantity);
        const weightedCost =
          existingCost != null && existingQty > 0
            ? (existingQty * existingCost + newQty * Number(line.unit_cost)) / (existingQty + newQty)
            : Number(line.unit_cost);
        await supabase.from("inventory_items").update({ unit_cost: weightedCost, updated_at: new Date().toISOString() }).eq("id", inventoryItemId);
      }
    } else {
      const { data: created, error: createError } = await supabase
        .from("inventory_items")
        .insert({
          vessel_id: invoice.vessel_id,
          related_helicopter: invoice.helicopter_registration,
          item_type: "Other",
          item_name: line.item_name,
          part_number: line.part_number,
          quantity: 0, // el trigger de stock_movements sube la cantidad abajo
          unit_cost: line.unit_cost,
          source: "User"
        })
        .select("id")
        .single();
      if (createError) throw new Error(createError.message);
      inventoryItemId = created.id;
    }

    await supabase.from("stock_movements").insert({
      inventory_item_id: inventoryItemId,
      movement_type: "Received",
      quantity: line.quantity,
      movement_date: invoice.invoice_date ?? new Date().toISOString().slice(0, 10),
      related_maintenance_event: campaignCode,
      campaign_id: invoice.campaign_id,
      notes: `Factura ${invoice.invoice_number ?? invoice.id.slice(0, 8)}${invoice.vendor ? ` — ${invoice.vendor}` : ""}`,
      source: "User"
    });

    await supabase.from("invoice_line_items").update({ matched_inventory_item_id: inventoryItemId }).eq("id", line.id);
  }

  await supabase.from("invoices").update({ extraction_status: "Reviewed", updated_at: new Date().toISOString() }).eq("id", invoiceId);

  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/invoices");
  revalidatePath("/inventory");
  if (invoice.campaign_id) revalidatePath(`/campaigns/${invoice.campaign_id}`);
  redirect(`/invoices/${invoiceId}`);
}

export async function archiveInvoice(id: string) {
  const { error } = await supabase.from("invoices").update({ archived: true, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/invoices");
  redirect("/invoices");
}
