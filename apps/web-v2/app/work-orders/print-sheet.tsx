// Print-only recreation of Formulario HS-06 ("ORDEN DE TRABAJO Nº ____"),
// the original Heliservix paper form (the same one this whole module
// digitizes) — logo, field layout, and section order match the original
// docx as closely as a screen/print view reasonably can. Hidden on screen
// (`hidden print:block`); the interactive card view in page.tsx is what's
// hidden when printing instead. Deliberately uses the real HeliServiX logo
// (public/brand/heliservix-logo.png), not any Air Supplies branding.
type PersonnelRow = { id: string; full_name: string; license_number: string | null };

type WorkOrderPrintSheetProps = {
  order: {
    sequence_number: number;
    client_name: string | null;
    client_address: string | null;
    client_phone: string | null;
    aircraft_type: string | null;
    aircraft_registration: string | null;
    helicopter_registration: string | null;
    aircraft_serial: string | null;
    engine_type: string | null;
    engine_model: string | null;
    engine_serial: string | null;
    estimated_hours: number | null;
    material_notes: string | null;
    contract_number: string | null;
    lead_technician_id: string | null;
    technician_completed_at: string | null;
    manager_approved_by: string | null;
    manager_approved_at: string | null;
    technician_signature_url: string | null;
    manager_signature_url: string | null;
  };
  items: Array<{
    id: string;
    description: string;
    section_label: string | null;
    is_complete: boolean;
    completed_by_personnel_id: string | null;
    completed_at: string | null;
    photo_url: string | null;
    signature_url: string | null;
  }>;
  personnelById: Map<string, PersonnelRow>;
};

function fmt(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("es-PA", { year: "numeric", month: "short", day: "numeric" });
}

export function WorkOrderPrintSheet({ order, items, personnelById }: WorkOrderPrintSheetProps) {
  const nameFor = (personnelId: string | null) => {
    if (!personnelId) return "";
    const p = personnelById.get(personnelId);
    if (!p) return "";
    return p.license_number ? `${p.full_name} (Lic. ${p.license_number})` : p.full_name;
  };

  const pending = items.filter((i) => !i.is_complete);
  const done = items.filter((i) => i.is_complete);
  const orderCode = `OT-${String(order.sequence_number).padStart(5, "0")}`;

  return (
    <div className="hidden print:block print:text-black">
      <div className="flex items-start justify-between border-b-2 border-black pb-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/heliservix-logo.png" alt="HeliServiX" className="h-14 w-auto object-contain" />
        <div className="text-right">
          <p className="text-lg font-bold">ORDEN DE TRABAJO Nº {orderCode}</p>
          <p className="text-[10px] text-gray-600">Formulario HS-06</p>
        </div>
      </div>

      <div className="mt-3 border border-black text-[11px]">
        <div className="border-b border-black p-1.5">
          <span className="font-bold">CLIENTE: </span>
          {order.client_name || ""}
        </div>
        <div className="grid grid-cols-2 border-b border-black">
          <div className="border-r border-black p-1.5">
            <span className="font-bold">DIRECCION: </span>
            {order.client_address || ""}
          </div>
          <div className="p-1.5">
            <span className="font-bold">TELEFONO: </span>
            {order.client_phone || ""}
          </div>
        </div>
        <div className="grid grid-cols-3 border-b border-black">
          <div className="border-r border-black p-1.5">
            <span className="font-bold">AERONAVE: </span>
            {order.aircraft_type || ""}
          </div>
          <div className="border-r border-black p-1.5">
            <span className="font-bold">MATRICULA: </span>
            {order.aircraft_registration || order.helicopter_registration || ""}
          </div>
          <div className="p-1.5">
            <span className="font-bold">S/N: </span>
            {order.aircraft_serial || ""}
          </div>
        </div>
        <div className="grid grid-cols-3">
          <div className="border-r border-black p-1.5">
            <span className="font-bold">MOTOR: </span>
            {order.engine_type || ""}
          </div>
          <div className="border-r border-black p-1.5">
            <span className="font-bold">MODELO: </span>
            {order.engine_model || ""}
          </div>
          <div className="p-1.5">
            <span className="font-bold">S/N: </span>
            {order.engine_serial || ""}
          </div>
        </div>
      </div>

      <div className="mt-3 border border-black text-[11px]">
        <p className="border-b border-black bg-gray-100 p-1.5 font-bold">DESCRIPCION DEL TRABAJO REQUERIDO:</p>
        <div className="space-y-1 p-1.5">
          {pending.length ? (
            pending.map((item, i) => (
              <p key={item.id} className="break-inside-avoid">
                {i + 1}) {item.section_label ? `[${item.section_label}] ` : ""}
                {item.description}
              </p>
            ))
          ) : (
            <p className="text-gray-500">— Ninguna tarea pendiente —</p>
          )}
        </div>
      </div>

      <div className="mt-3 border border-black text-[11px]">
        <p className="border-b border-black bg-gray-100 p-1.5 font-bold">TRABAJO REALIZADO:</p>
        <div className="space-y-1 p-1.5">
          {done.length ? (
            done.map((item, i) => (
              <div key={item.id} className="flex items-center gap-2 break-inside-avoid">
                <p className="flex-1">
                  {i + 1}) {item.description}{" "}
                  <span className="text-[9px] text-gray-600">
                    — hecho por {nameFor(item.completed_by_personnel_id) || "—"}
                    {item.completed_at ? ` el ${fmt(item.completed_at)}` : ""}
                  </span>
                </p>
                {item.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.photo_url} alt="Foto" className="h-8 w-8 shrink-0 border border-black object-cover" />
                ) : null}
                {item.signature_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.signature_url} alt="Firma" className="h-6 w-auto shrink-0 border border-black bg-white" />
                ) : null}
              </div>
            ))
          ) : (
            <p className="text-gray-500">— Nada completado todavía —</p>
          )}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 border border-black text-[11px]">
        <div className="border-r border-black p-1.5">
          <span className="font-bold">HORAS ESTIMADAS: </span>
          {order.estimated_hours ?? ""}
        </div>
        <div className="p-1.5">
          <span className="font-bold">MATERIAL: </span>
          {order.material_notes || ""}
          <span className="ml-4 font-bold">CONTRATO No.: </span>
          {order.contract_number || ""}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-8 text-center text-[11px]">
        <div>
          <p className="font-bold">TECNICO ENCARGADO</p>
          {order.technician_signature_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={order.technician_signature_url} alt="Firma del técnico" className="mx-auto mt-2 h-14 w-auto object-contain" />
          ) : (
            <div className="mt-8" />
          )}
          <div className="border-t border-black pt-1">FIRMA</div>
          <p className="mt-1">{nameFor(order.lead_technician_id) || "—"}</p>
          <p className="mt-1 text-[10px]">FECHA: {order.technician_completed_at ? fmt(order.technician_completed_at) : "____________"}</p>
        </div>
        <div>
          <p className="font-bold">GERENTE GENERAL</p>
          <p className="text-[10px]">HELISER VIX INC.</p>
          {order.manager_signature_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={order.manager_signature_url} alt="Firma del gerente" className="mx-auto mt-1 h-14 w-auto object-contain" />
          ) : (
            <div className="mt-4" />
          )}
          <div className="border-t border-black pt-1">FIRMA</div>
          <p className="mt-1">{nameFor(order.manager_approved_by) || "—"}</p>
          <p className="mt-1 text-[10px]">FECHA: {order.manager_approved_at ? fmt(order.manager_approved_at) : "____________"}</p>
        </div>
      </div>

      <p className="mt-6 border-t border-black pt-1 text-center text-[9px] font-bold">
        Formulario HS-06 · Generado por HeliServiX OS el {new Date().toLocaleDateString("es-PA")}
      </p>
    </div>
  );
}
