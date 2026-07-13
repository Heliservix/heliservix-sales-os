import Link from "next/link";
import { UploadCloud } from "lucide-react";

export default function PortalHomePage() {
  return (
    <div className="hsv-panel text-center">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">HeliServiX OS</p>
      <h1 className="mt-2 text-xl font-semibold text-ink">¿Desea subir el reporte de la nueva semana de trabajo?</h1>
      <p className="mt-2 text-sm text-ink-subtle">
        Solo toma un minuto: eliges tu faena y subes el mismo archivo Excel de siempre.
      </p>
      <Link href="/portal/upload" className="hsv-primary-button mx-auto mt-6 w-full max-w-xs justify-center">
        <UploadCloud className="h-4 w-4" aria-hidden="true" />
        Sí, subir reporte
      </Link>
    </div>
  );
}
