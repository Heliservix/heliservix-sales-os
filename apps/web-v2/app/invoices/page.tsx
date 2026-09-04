import Link from "next/link";
import { Plus, Receipt } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Panel } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status-pill";
import { SectionHeader } from "@/components/ui/section-header";
import { supabase } from "@/lib/supabase";

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
  Reviewed: "Confirmada",
  Failed: "Completar a mano"
};

type InvoiceListRow = {
  id: string;
  vendor: string | null;
  invoice_number: string | null;
  invoice_date: string | null;
  total_amount: number | null;
  currency: string | null;
  extraction_status: string;
  created_at: string;
  campaigns: { id: string; code: string | null; name: string } | null;
  vessels: { name: string } | null;
};

export default async function InvoicesPage() {
  const { data, error } = await supabase
    .from("invoices")
    .select("id, vendor, invoice_number, invoice_date, total_amount, currency, extraction_status, created_at, campaigns:campaign_id(id, code, name), vessels:vessel_id(name)")
    .eq("archived", false)
    .order("created_at", { ascending: false });

  const invoices = (data ?? []) as unknown as InvoiceListRow[];

  return (
    <AppShell>
      <div className="mx-auto max-w-[1500px]">
        <SectionHeader
          eyebrow="Compras"
          title="Facturas"
          description="Facturas subidas por faena o por barco — leídas automáticamente por IA cuando está configurada, y aplicadas al inventario al confirmarlas."
          icon={Receipt}
        />

        <div className="mb-5">
          <Link className="hsv-primary-button" href="/invoices/new">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Subir factura
          </Link>
        </div>

        <Panel>
          {error ? <div className="hsv-error-banner">No se pudo conectar con la base de datos: {error.message}.</div> : null}
          <div className="hsv-table-wrap">
            <table className="hsv-table">
              <thead className="hsv-table-head">
                <tr>
                  <th className="hsv-table-th">Fecha</th>
                  <th className="hsv-table-th">Proveedor</th>
                  <th className="hsv-table-th">Faena / Barco</th>
                  <th className="hsv-table-th">Total</th>
                  <th className="hsv-table-th">Estado</th>
                </tr>
              </thead>
              <tbody className="hsv-table-body">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hsv-table-row">
                    <td className="hsv-table-cell text-ink-muted">{inv.invoice_date ?? inv.created_at?.slice(0, 10)}</td>
                    <td className="hsv-table-cell">
                      <Link className="font-semibold text-ink hover:text-aviation-teal" href={`/invoices/${inv.id}`}>
                        {inv.vendor || "Factura sin proveedor"}
                      </Link>
                      {inv.invoice_number ? <p className="mt-0.5 text-xs text-ink-subtle">N° {inv.invoice_number}</p> : null}
                    </td>
                    <td className="hsv-table-cell text-ink-muted">
                      {inv.campaigns ? (
                        <Link className="hover:text-aviation-teal" href={`/campaigns/${inv.campaigns.id}`}>
                          {inv.campaigns.code ? `Marea ${inv.campaigns.code}` : inv.campaigns.name}
                        </Link>
                      ) : inv.vessels ? (
                        inv.vessels.name
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="hsv-table-cell hsv-technical-value">
                      {inv.total_amount != null ? `${inv.currency ?? "USD"} ${Number(inv.total_amount).toFixed(2)}` : "—"}
                    </td>
                    <td className="hsv-table-cell">
                      <StatusPill tone={STATUS_TONE[inv.extraction_status] ?? "neutral"}>
                        {STATUS_LABEL[inv.extraction_status] ?? inv.extraction_status}
                      </StatusPill>
                    </td>
                  </tr>
                ))}
                {!invoices.length && !error ? (
                  <tr>
                    <td className="hsv-empty-state" colSpan={5}>
                      Todavía no hay facturas subidas.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
