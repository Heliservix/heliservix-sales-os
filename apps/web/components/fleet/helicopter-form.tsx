import type { Helicopter } from "@/types/fleet";
import { vessels } from "@/lib/fleet-data";
import { MockFormActions } from "@/components/fleet/mock-form-actions";
import { Panel } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status-pill";

type HelicopterFormProps = {
  mode: "create" | "edit";
  helicopter?: Helicopter;
};

export function HelicopterForm({ mode, helicopter }: HelicopterFormProps) {
  return (
    <Panel>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-ink">{mode === "create" ? "Add Helicopter" : "Edit Helicopter"}</h2>
          <p className="mt-1 text-sm text-ink-subtle">Use verified HeliServiX data only. Demo registrations and assignments are not operational records.</p>
        </div>
        <StatusPill tone="amber">Mock form</StatusPill>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {[
          ["Registration", helicopter?.registration ?? ""],
          ["Model", helicopter?.model ?? ""],
          ["Serial number", helicopter?.serialNumber ?? ""],
          ["Year / manufacture date", helicopter?.manufactureYear ?? ""],
          ["Current hourmeter", helicopter?.currentHourmeter ?? ""],
          ["Owner company", helicopter?.ownerCompany ?? ""],
          ["Country / operation area", helicopter?.operationArea ?? ""],
          ["Base", helicopter?.base ?? ""]
        ].map(([label, value]) => (
          <label key={label} className="grid gap-2 text-sm font-medium text-ink">
            {label}
            <input className="h-11 rounded-md border border-line bg-white px-3 text-sm text-ink shadow-control outline-none dark:bg-canvas-muted" defaultValue={value} />
          </label>
        ))}
        <label className="grid gap-2 text-sm font-medium text-ink">
          Status
          <select className="h-11 rounded-md border border-line bg-white px-3 text-sm text-ink shadow-control outline-none dark:bg-canvas-muted" defaultValue={helicopter?.status ?? "Available"}>
            <option>Available</option>
            <option>Assigned</option>
            <option>In Campaign</option>
            <option>Maintenance</option>
            <option>Grounded</option>
            <option>Retired</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-medium text-ink">
          Assigned vessel
          <select className="h-11 rounded-md border border-line bg-white px-3 text-sm text-ink shadow-control outline-none dark:bg-canvas-muted" defaultValue={helicopter?.assignedVessel ?? "Unassigned"}>
            <option>Unassigned</option>
            {vessels.map((vessel) => (
              <option key={vessel.id}>{vessel.name}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-medium text-ink sm:col-span-2">
          Notes
          <textarea className="min-h-28 rounded-md border border-line bg-white px-3 py-3 text-sm text-ink shadow-control outline-none dark:bg-canvas-muted" defaultValue={helicopter?.notes ?? ""} />
        </label>
      </div>
      <MockFormActions submitLabel={mode === "create" ? "Simulate helicopter create" : "Simulate helicopter update"} />
    </Panel>
  );
}
