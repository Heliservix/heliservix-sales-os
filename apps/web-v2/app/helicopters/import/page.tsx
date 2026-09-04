import { redirect } from "next/navigation";
import { UploadCloud } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Panel } from "@/components/ui/panel";
import { SectionHeader } from "@/components/ui/section-header";
import { ImportForm } from "@/app/helicopters/import/import-form";
import { getTechnicianScope } from "@/lib/technician-scope";

export default async function ImportComponentControlPage() {
  // El Excel de importación puede traer cualquier matrícula — un técnico
  // acotado a una sola aeronave no debe poder tocar datos de otras.
  const { scopedRegistration } = await getTechnicianScope();
  if (scopedRegistration) redirect(`/helicopters/${scopedRegistration}`);

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <SectionHeader
          eyebrow="Componentes"
          title="Importar Control de Componentes"
          description="Sube el Excel de Control Maestro de un helicóptero. Crea el helicóptero si no existe y actualiza cada componente por P/N + S/N."
          icon={UploadCloud}
        />
        <Panel>
          <ImportForm />
        </Panel>
      </div>
    </AppShell>
  );
}
