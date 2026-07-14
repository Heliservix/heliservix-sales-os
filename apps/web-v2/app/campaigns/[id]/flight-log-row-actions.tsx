"use client";

import { reassignFlightLog, deleteFlightLog } from "@/app/campaigns/[id]/flight-log-actions";

type OtherCampaign = { id: string; code: string | null; name: string };

export function FlightLogRowActions({
  flightLogId,
  campaignId,
  otherCampaigns
}: {
  flightLogId: string;
  campaignId: string;
  otherCampaigns: OtherCampaign[];
}) {
  const reassignAction = reassignFlightLog.bind(null, flightLogId);
  const deleteAction = deleteFlightLog.bind(null, campaignId, flightLogId);

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <form action={reassignAction} className="flex items-center gap-1">
        <select name="newCampaignId" defaultValue="" required className="h-8 rounded-md border border-line bg-white px-1.5 text-xs text-ink-muted shadow-control outline-none">
          <option value="" disabled>
            Reasignar a…
          </option>
          {otherCampaigns.map((c) => (
            <option key={c.id} value={c.id}>
              {c.code ?? c.name}
            </option>
          ))}
        </select>
        <button type="submit" className="hsv-ghost-button h-8 px-2 text-xs">
          Mover
        </button>
      </form>
      <form
        action={deleteAction}
        onSubmit={(event) => {
          const confirmed = window.confirm(
            "¿Eliminar este reporte semanal?\n\nEsto NO devuelve las horas ya descontadas del helicóptero ni de sus componentes — solo úsalo si este reporte fue un duplicado real que nunca debió existir. Si las horas se aplicaron mal, pide ayuda para corregirlas aparte."
          );
          if (!confirmed) event.preventDefault();
        }}
      >
        <button type="submit" className="hsv-danger-button h-8 px-2 text-xs">
          Eliminar
        </button>
      </form>
    </div>
  );
}
