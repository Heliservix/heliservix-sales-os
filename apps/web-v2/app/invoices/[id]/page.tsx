import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Plus, Receipt, Trash2 } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Panel } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status-pill";
import { SectionHeader } from "@/components/ui/section-header";
import { supabase } from "@/lib/supabase";
import {
  addInvoiceLineItem,
  confirmInvoice,
  deleteInvoiceLineItem,
  updateInvoiceHeader,
  updateInvoiceLineItem
} from "@/app/invoices/actions";

export const dynamic = "force-dynamic";

const STATUS_TONE: Record<string, "green" | "amber" | "blue" | "red" | "neutral"> = {
  Pending: "neutral",
  Extracted: "blue",
  Reviewed: "green",
  Failed: "red"
};

const STATUS_LABEL: Record<string, string> = {
  Pending: "Pendiente",
  Extracted: "Leída por IA — revisar",
  Reviewed: "Confirmada — aplicada a inventario",
  Failed: "No se pudo leer — completar a mano"
};

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: invoice } = await supabase
    .from("invoices")
    .select("*, campaigns:campaign_id(id, code, name), vessels:vessel_id(id, name)")
    .eq("id", id)
    .maybeSingle();
  if (!invoice) notFound();

  const { data: lineItems } = await supabase.from("invoice_line_items").select("*").eq("invoice_id", id).order("created_at");

  const boundUpdateHeader = updateInvoiceHeader.bind(null, id);
  const boundAddLine = addInvoiceLineItem.bind(null, id);
  const boundConfirm = confirmInvoice.bind(null, id);
  const isReviewed = invoice.extraction_status === "Reviewed";
  const total = (lineItems ?? []).reduce((sum, li) => sum + (li.line_total != null ? Number(li.line_total) : 0), 0);

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl">
        <SectionHeader
          eyebrow="Compras / Facturas"
          title={invoice.vendor || "Factura"}
          description={invoice.invoice_number ? `N° ${invoice.invoice_number}` : "Revisa los datos antes de aplicarlos al inventario"}
          icon={Receipt}
        />

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <StatusPill tone={STATUS_TONE[invoice.extraction_status] ?? "neutral"}>{STATUS_LABEL[invoice.extraction_status] ?? invoice.extraction_status}</StatusPill>
          {invoice.campaigns ? (
            <Link href={`/campaigns/${invoice.campaigns.id}`} className="text-sm font-semibold text-aviation-teal hover:underline">
              {invoice.campaigns.code ? `Marea ${invoice.campaigns.code}` : invoice.campaigns.name}
            </Link>
          ) : null}
          {invoice.vessels ? <span className="text-sm text-ink-subtle">{invoice.vessels.name}</span> : null}
          {invoice.file_url ? (
            <a href={invoice.file_url} target="_blank" rel="noreferrer" className="text-sm font-semibold text-aviation-teal hover:underline">
              Ver archivo original
            </a>
          ) : null}
        </div>

        {invoice.ai_notes ? <div className="hsv-error-banner mb-4">{invoice.ai_notes}</div> : null}

        <Panel className="mb-5">
          <h2 className="mb-4 text-lg font-semibold text-ink">Datos de la factura</h2>
          <form action={boundUpdateHeader} className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Proveedor
              <input className="hsv-control" name="vendor" defaultValue={invoice.vendor ?? ""} disabled={isReviewed} />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              N° de factura
              <input className="hsv-control" name="invoiceNumber" defaultValue={invoice.invoice_number ?? ""} disabled={isReviewed} />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Fecha
              <input className="hsv-control" type="date" name="invoiceDate" defaultValue={invoice.invoice_date ?? ""} disabled={isReviewed} />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Moneda
              <input className="hsv-control" name="currency" defaultValue={invoice.currency ?? "USD"} disabled={isReviewed} />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Total de la factura
              <input className="hsv-control" type="number" step="0.01" name="totalAmount" defaultValue={invoice.total_amount ?? ""} disabled={isReviewed} />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink sm:col-span-2">
              Notas
              <textarea className="hsv-textarea" name="notes" defaultValue={invoice.notes ?? ""} disabled={isReviewed} />
            </label>
            {!isReviewed ? (
              <div className="sm:col-span-2">
                <button className="hsv-secondary-button" type="submit">
                  Guardar datos
                </button>
              </div>
            ) : null}
          </form>
        </Panel>

        <Panel className="mb-5">
          <h2 className="mb-4 text-lg font-semibold text-ink">Ítems de la factura</h2>
          <div className="hsv-table-wrap">
            <table className="hsv-table">
              <thead className="hsv-table-head">
                <tr>
                  <th className="hsv-table-th">Ítem</th>
                  <th className="hsv-table-th">N° de parte</th>
                  <th className="hsv-table-th">Cantidad</th>
                  <th className="hsv-table-th">Costo unitario</th>
                  <th className="hsv-table-th">Total línea</th>
                  {!isReviewed ? <th className="hsv-table-th">Acciones</th> : null}
                </tr>
              </thead>
              <tbody className="hsv-table-body">
                {(lineItems ?? []).map((li) => {
                  const boundUpdateLine = updateInvoiceLineItem.bind(null, id, li.id);
                  const boundDeleteLine = deleteInvoiceLineItem.bind(null, id, li.id);
                  return (
                    <tr key={li.id} className="hsv-table-row">
                      {isReviewed ? (
                        <>
                          <td className="hsv-table-cell font-semibold text-ink">{li.item_name}</td>
                          <td className="hsv-table-cell text-ink-muted">{li.part_number || "—"}</td>
                          <td className="hsv-table-cell hsv-technical-value">{Number(li.quantity)}</td>
                          <td className="hsv-table-cell hsv-technical-value">{li.unit_cost != null ? `$${Number(li.unit_cost).toFixed(2)}` : "—"}</td>
                          <td className="hsv-table-cell hsv-technical-value">{li.line_total != null ? `$${Number(li.line_total).toFixed(2)}` : "—"}</td>
                        </>
                      ) : (
                        <>
                          <td className="hsv-table-cell">
                            <form id={`line-${li.id}`} action={boundUpdateLine} />
                            <input form={`line-${li.id}`} className="hsv-control !py-1 text-sm" name="itemName" defaultValue={li.item_name} required />
                          </td>
                          <td className="hsv-table-cell">
                            <input form={`line-${li.id}`} className="hsv-control !py-1 text-sm" name="partNumber" defaultValue={li.part_number ?? ""} />
                          </td>
                          <td className="hsv-table-cell">
                            <input
                              form={`line-${li.id}`}
                              className="hsv-control !py-1 w-20 text-sm"
                              type="number"
                              step="0.01"
                              name="quantity"
                              defaultValue={li.quantity}
                            />
                          </td>
                          <td className="hsv-table-cell">
                            <input
                              form={`line-${li.id}`}
                              className="hsv-control !py-1 w-24 text-sm"
                              type="number"
                              step="0.01"
                              name="unitCost"
                              defaultValue={li.unit_cost ?? ""}
                            />
                          </td>
                          <td className="hsv-table-cell hsv-technical-value">{li.line_total != null ? `$${Number(li.line_total).toFixed(2)}` : "—"}</td>
                          <td className="hsv-table-cell">
                            <div className="flex items-center gap-2">
                              <button form={`line-${li.id}`} type="submit" className="hsv-ghost-button !px-2 !py-1 text-[11px]">
                                Guardar
                              </button>
                              <form action={boundDeleteLine}>
                                <button type="submit" className="hsv-ghost-button !px-2 !py-1 text-[11px] text-status-red">
                                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                                </button>
                              </form>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
                {!lineItems?.length ? (
                  <tr>
                    <td className="hsv-empty-state" colSpan={isReviewed ? 5 : 6}>
                      Sin ítems todavía — agrega uno abajo.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-right text-sm font-semibold text-ink">Total de ítems: ${total.toFixed(2)}</p>

          {!isReviewed ? (
            <form action={boundAddLine} className="mt-5 grid gap-3 rounded-lg border border-line bg-canvas-muted p-3 sm:grid-cols-5">
              <input className="hsv-control sm:col-span-2" name="itemName" placeholder="Nombre del ítem" required />
              <input className="hsv-control" name="partNumber" placeholder="N° de parte" />
              <input className="hsv-control" type="number" step="0.01" name="quantity" placeholder="Cantidad" defaultValue="1" />
              <input className="hsv-control" type="number" step="0.01" name="unitCost" placeholder="Costo unitario" />
              <div className="sm:col-span-5">
                <button type="submit" className="hsv-secondary-button">
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Agregar ítem
                </button>
              </div>
            </form>
          ) : null}
        </Panel>

        {!isReviewed ? (
          <Panel>
            <p className="text-sm text-ink-subtle">
              Al confirmar, cada ítem sube el inventario correspondiente (o crea uno nuevo si no existe) y actualiza su costo promedio —
              esto solo se aplica una vez.
            </p>
            <form action={boundConfirm} className="mt-4">
              <button type="submit" className="hsv-primary-button">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                Confirmar factura y aplicar a inventario
              </button>
            </form>
          </Panel>
        ) : null}
      </div>
    </AppShell>
  );
}
