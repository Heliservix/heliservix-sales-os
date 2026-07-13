import { UploadCloud } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Panel } from "@/components/ui/panel";
import { SectionHeader } from "@/components/ui/section-header";
import { ImportForm } from "@/app/helicopters/import/import-form";

export default function ImportComponentControlPage() {
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
