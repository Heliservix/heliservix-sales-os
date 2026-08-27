// Print-only recreation of Formulario AS-09 ("CONTROL DE REPORTE DE
// NO-RUTINA") from the shop's original maintenance manual — same field
// layout/order (Matrícula/Modelo/T.T./Fecha/Ítem N°/N° W-O header row,
// Discrepancia box, Acción Correctiva box, Control de Componente table,
// closeout) as the original, but with the real HeliServiX letterhead
// (logo + "HELISER VIX INC.") instead of the old Air Supplies letterhead
// the physical form carried. Hidden on screen (`hidden print:block`).
type PersonnelRow = { id: string; full_name: string; license_number: string | null };
type ComponentChangeRow = { id: string; description: string | null; part_number: string | null; serial_removed: string | null; serial_installed: string | null };

type NonRoutinePrintSheetProps = {
  report: {
    sequence_number: number;
    helicopter_registration: string | null;
    aircraft_model: string | null;
    work_order_id: string | null;
    total_time_hours: number | null;
    report_date: string | null;
    discrepancy: string | null;
    opened_by_personnel_id: string | null;
    corrective_action: string | null;
    corrected_by_personnel_id: string | null;
    manual_reference: string | null;
    inspector_personnel_id: string | null;
    completed_at: string | null;
    status: string;
  };
  components: ComponentChangeRow[];
  personnelById: Map<string, PersonnelRow>;
  relatedOrderCode: string | null;
};

function fmt(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("es-PA", { year: "numeric", month: "short", day: "numeric" });
}

export function NonRoutinePrintSheet({ report, components, personnelById, relatedOrderCode }: NonRoutinePrintSheetProps) {
  const nameOnly = (personnelId: string | null) => (personnelId ? (personnelById.get(personnelId)?.full_name ?? "") : "");
  const licOnly = (personnelId: string | null) => (personnelId ? (personnelById.get(personnelId)?.license_number ?? "") : "");
  const reportCode = `NR-${String(report.sequence_number).padStart(5, "0")}`;

  return (
    <div className="hidden print:block print:text-black">
      <div className="flex items-start justify-between border-b-2 border-black pb-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/heliservix-logo.png" alt="HeliServiX" className="h-14 w-auto object-contain" />
        <div className="text-right">
          <p className="text-sm font-bold">HELISER VIX INC.</p>
          <p className="text-lg font-bold">REPORTE NO RUTINA {reportCode}</p>
          <p className="text-[10px] text-gray-600">Formato: AS-09</p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-6 border border-black text-[10px]">
        <div className="border-r border-black p-1.5">
          <span className="block font-bold">Matrícula</span>
          {report.helicopter_registration || ""}
        </div>
        <div className="border-r border-black p-1.5">
          <span className="block font-bold">Modelo</span>
          {report.aircraft_model || ""}
        </div>
        <div className="border-r border-black p-1.5">
          <span className="block font-bold">T.T.</span>
          {report.total_time_hours ?? ""}
        </div>
        <div className="border-r border-black p-1.5">
          <span className="block font-bold">Fecha</span>
          {report.report_date || ""}
        </div>
        <div className="border-r border-black p-1.5">
          <span className="block font-bold">Ítem N°</span>
          {reportCode}
        </div>
        <div className="p-1.5">
          <span className="block font-bold">N° W/O</span>
          {relatedOrderCode || "—"}
        </div>
      </div>

      <div className="mt-3 border border-black text-[11px]">
        <p className="border-b border-black bg-gray-100 p-1.5 font-bold">DISCREPANCIA:</p>
        <p className="min-h-[3em] p-1.5">{report.discrepancy || ""}</p>
        <div className="grid grid-cols-2 border-t border-black">
          <div className="border-r border-black p-1.5">
            <span className="font-bold">MECANICO: </span>
            {nameOnly(report.opened_by_personnel_id)}
          </div>
          <div className="p-1.5">
            <span className="font-bold">No. LIC.: </span>
            {licOnly(report.opened_by_personnel_id)}
          </div>
        </div>
      </div>

      <div className="mt-3 border border-black text-[11px]">
        <p className="border-b border-black bg-gray-100 p-1.5 font-bold">ACCION CORRECTIVA:</p>
        <p className="min-h-[3em] p-1.5">{report.corrective_action || "Pendiente"}</p>
        <div className="grid grid-cols-2 border-t border-black">
          <div className="border-r border-black p-1.5">
            <span className="font-bold">MECANICO: </span>
            {nameOnly(report.corrected_by_personnel_id)}
          </div>
          <div className="p-1.5">
            <span className="font-bold">No. LIC.: </span>
            {licOnly(report.corrected_by_personnel_id)}
          </div>
        </div>
      </div>

      <div className="mt-3 border border-black p-1.5 text-[11px]">
        <span className="font-bold">REFERENCIA DE MANUAL: </span>
        {report.manual_reference || "—"}
      </div>

      <div className="mt-3 border border-black text-[11px]">
        <p className="border-b border-black bg-gray-100 p-1.5 font-bold">CONTROL DE COMPONENTE</p>
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="border-b border-r border-black p-1 text-left">DESCRIPCIÓN</th>
              <th className="border-b border-r border-black p-1 text-left">NUMERO DE PARTE</th>
              <th className="border-b border-r border-black p-1 text-left">S/N REMOVIDO</th>
              <th className="border-b border-black p-1 text-left">S/N INSTALADO</th>
            </tr>
          </thead>
          <tbody>
            {components.length ? (
              components.map((c) => (
                <tr key={c.id}>
                  <td className="border-r border-black p-1">{c.description || ""}</td>
                  <td className="border-r border-black p-1">{c.part_number || ""}</td>
                  <td className="border-r border-black p-1">{c.serial_removed || ""}</td>
                  <td className="p-1">{c.serial_installed || ""}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="p-1 text-gray-500" colSpan={4}>
                  — Sin cambios de componente —
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 grid grid-cols-3 border border-black text-[11px]">
        <div className="border-r border-black p-1.5">
          <span className="block font-bold">MECANICO</span>
          {nameOnly(report.corrected_by_personnel_id) || "—"}
          {licOnly(report.corrected_by_personnel_id) ? ` (Lic. ${licOnly(report.corrected_by_personnel_id)})` : ""}
        </div>
        <div className="border-r border-black p-1.5">
          <span className="block font-bold">INSPECTOR</span>
          {nameOnly(report.inspector_personnel_id) || "—"}
          {licOnly(report.inspector_personnel_id) ? ` (Lic. ${licOnly(report.inspector_personnel_id)})` : ""}
        </div>
        <div className="p-1.5">
          <span className="block font-bold">FECHA COMPLETADA</span>
          {report.completed_at ? fmt(report.completed_at) : "—"}
        </div>
      </div>

      <p className="mt-6 border-t border-black pt-1 text-center text-[9px] font-bold">
        Formato: AS-09 · Estado: {report.status} · Generado por HeliServiX OS el {new Date().toLocaleDateString("es-PA")}
      </p>
    </div>
  );
}
