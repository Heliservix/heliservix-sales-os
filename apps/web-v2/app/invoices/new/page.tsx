import { Receipt } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Panel } from "@/components/ui/panel";
import { SectionHeader } from "@/components/ui/section-header";
import { supabase } from "@/lib/supabase";
import { uploadInvoice } from "@/app/invoices/actions";

export const dynamic = "force-dynamic";

type NewInvoicePageProps = {
  searchParams: Promise<{ campaignId?: string; vesselId?: string; helicopterRegistration?: string }>;
};

export default async function NewInvoicePage({ searchParams }: NewInvoicePageProps) {
  const { campaignId, vesselId, helicopterRegistration } = await searchParams;

  const [{ data: campaigns }, { data: vessels }, { data: helicopters }, preselectedCampaign] = await Promise.all([
    supabase.from("campaigns").select("id, code, name").order("code", { ascending: false }),
    supabase.from("vessels").select("id, name").eq("archived", false).order("name"),
    supabase.from("helicopters").select("registration").eq("archived", false).order("registration"),
    campaignId
      ? supabase.from("campaigns").select("id, code, name").eq("id", campaignId).maybeSingle().then((r) => r.data)
      : Promise.resolve(null)
  ]);

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl">
        <SectionHeader
          eyebrow="Compras / Facturas"
          title="Subir factura"
          description="Sube la foto o PDF de la factura — la IA intenta leer proveedor, ítems, cantidades y costos automáticamente. Siempre podrás revisar y corregir antes de que se aplique al inventario."
          icon={Receipt}
        />
        {preselectedCampaign ? (
          <div className="mb-4 rounded-lg border border-line bg-canvas-muted p-3 text-sm text-ink-subtle">
            Esta factura quedará vinculada a <span className="font-semibold text-ink">{preselectedCampaign.name}</span>
            {preselectedCampaign.code ? ` (${preselectedCampaign.code})` : ""}.
          </div>
        ) : null}
        <Panel>
          <form action={uploadInvoice} encType="multipart/form-data" className="grid gap-5 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-semibold text-ink sm:col-span-2">
              Archivo de la factura (foto o PDF)
              <input className="hsv-control" type="file" name="file" accept="image/*,application/pdf" capture="environment" required />
            </label>

            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Faena relacionada (opcional)
              <select className="hsv-control" name="campaignId" defaultValue={campaignId ?? ""}>
                <option value="">Sin vincular a una faena</option>
                {(campaigns ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code ? `${c.code} — ` : ""}
                    {c.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Barco relacionado (opcional)
              <select className="hsv-control" name="vesselId" defaultValue={vesselId ?? ""}>
                <option value="">Sin vincular a un barco</option>
                {(vessels ?? []).map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1.5 text-sm font-semibold text-ink sm:col-span-2">
              Helicóptero relacionado (opcional)
              <select className="hsv-control" name="helicopterRegistration" defaultValue={helicopterRegistration ?? ""}>
                <option value="">Sin vincular a un helicóptero</option>
                {(helicopters ?? []).map((h) => (
                  <option key={h.registration} value={h.registration}>
                    {h.registration}
                  </option>
                ))}
              </select>
            </label>

            <div className="sm:col-span-2">
              <button className="hsv-primary-button" type="submit">
                Subir y leer factura
              </button>
            </div>
          </form>
        </Panel>
      </div>
    </AppShell>
  );
}
