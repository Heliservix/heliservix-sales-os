import { ClipboardList } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Panel } from "@/components/ui/panel";
import { SectionHeader } from "@/components/ui/section-header";
import { WeeklyImportForm } from "@/app/reports/import/import-form";

export default function ImportWeeklyReportPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <SectionHeader
          eyebrow="Reportes"
          title="Importar Reporte Semanal"
          description="Sube el informe que entregan los mecánicos cada lunes. Aplica las horas voladas, actualiza el remanente de todos los componentes activos y registra inspecciones, no-rutinas y cambios de filtro."
          icon={ClipboardList}
        />
        <Panel>
          <WeeklyImportForm />
        </Panel>
      </div>
    </AppShell>
  );
}
