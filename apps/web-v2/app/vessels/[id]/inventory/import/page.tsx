import { notFound } from "next/navigation";
import { UploadCloud } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Panel } from "@/components/ui/panel";
import { SectionHeader } from "@/components/ui/section-header";
import { supabase } from "@/lib/supabase";
import { importVesselInventory } from "@/app/vessels/[id]/inventory/import/actions";
import { InventoryImportForm } from "@/app/vessels/[id]/inventory/import/import-form";

type ImportInventoryPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ImportInventoryPage({ params }: ImportInventoryPageProps) {
  const { id } = await params;
  const { data: vessel } = await supabase.from("vessels").select("id, name").eq("id", id).maybeSingle();
  if (!vessel) notFound();

  const boundImport = importVesselInventory.bind(null, id);

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <SectionHeader
          eyebrow={`Bodega — ${vessel.name}`}
          title="Cargar inventario desde Excel"
          description="Para cargar el conteo inicial de la bodega o hacer un recuento periódico completo, en lugar de agregar ítem por ítem."
          icon={UploadCloud}
        />
        <Panel>
          <InventoryImportForm vesselId={id} action={boundImport} />
        </Panel>
      </div>
    </AppShell>
  );
}
