import type { FlightLog } from "@/types/fleet";
import { helicopters, vessels } from "@/lib/fleet-data";
import { MockFormActions } from "@/components/fleet/mock-form-actions";
import { Panel } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status-pill";

type FlightLogFormProps = {
  mode: "create" | "edit";
  flightLog?: FlightLog;
};

export function FlightLogForm({ mode, flightLog }: FlightLogFormProps) {
  return (
    <Panel>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-ink">{mode === "create" ? "Create Flight Log" : "Edit Flight Log"}</h2>
          <p className="mt-1 text-sm text-ink-subtle">This simulates the future flight-hour workflow. No hourmeters or components are recalculated yet.</p>
        </div>
        <StatusPill tone="amber">Mock form</StatusPill>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium text-ink">
          Helicopter
          <select className="h-11 rounded-md border border-line bg-white px-3 text-sm text-ink shadow-control outline-none dark:bg-canvas-muted" defaultValue={flightLog?.helicopterRegistration ?? "HP1804"}>
            {helicopters.map((helicopter) => (
              <option key={helicopter.registration}>{helicopter.registration}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-medium text-ink">
          Vessel / campaign
          <select className="h-11 rounded-md border border-line bg-white px-3 text-sm text-ink shadow-control outline-none dark:bg-canvas-muted" defaultValue={flightLog?.vesselName ?? "Demo Vessel A"}>
            {vessels.map((vessel) => (
              <option key={vessel.id}>{vessel.name}</option>
            ))}
          </select>
        </label>
        {[
          ["Flight date", flightLog?.flightDate ?? "2026-07-07"],
          ["Pilot", flightLog?.pilot ?? ""],
          ["Mechanic", flightLog?.mechanic ?? ""],
          ["Hobbs start", flightLog?.hobbsStart ?? ""],
          ["Hobbs end", flightLog?.hobbsEnd ?? ""]
        ].map(([label, value]) => (
          <label key={label} className="grid gap-2 text-sm font-medium text-ink">
            {label}
            <input className="h-11 rounded-md border border-line bg-white px-3 text-sm text-ink shadow-control outline-none dark:bg-canvas-muted" defaultValue={value} />
          </label>
        ))}
        <label className="grid gap-2 text-sm font-medium text-ink sm:col-span-2">
          Notes
          <textarea className="min-h-28 rounded-md border border-line bg-white px-3 py-3 text-sm text-ink shadow-control outline-none dark:bg-canvas-muted" defaultValue={flightLog?.notes ?? ""} />
        </label>
      </div>
      <MockFormActions submitLabel={mode === "create" ? "Simulate flight log create" : "Simulate flight log update"} />
    </Panel>
  );
}
