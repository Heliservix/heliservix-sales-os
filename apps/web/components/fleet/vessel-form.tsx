import type { Vessel } from "@/types/fleet";
import { helicopters } from "@/lib/fleet-data";
import { MockFormActions } from "@/components/fleet/mock-form-actions";
import { Panel } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status-pill";

type VesselFormProps = {
  mode: "create" | "edit";
  vessel?: Vessel;
};

export function VesselForm({ mode, vessel }: VesselFormProps) {
  return (
    <Panel>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-ink">{mode === "create" ? "Add Vessel" : "Edit Vessel"}</h2>
          <p className="mt-1 text-sm text-ink-subtle">Mock state only. Real vessel records must be entered by HeliServiX or imported from approved sources.</p>
        </div>
        <StatusPill tone="amber">Demo form</StatusPill>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium text-ink">
          Vessel name
          <input className="hsv-control" defaultValue={vessel?.name ?? ""} placeholder="Enter official vessel name" />
        </label>
        <label className="grid gap-2 text-sm font-medium text-ink">
          Owner company
          <input className="hsv-control" defaultValue={vessel?.owner ?? ""} placeholder="Enter owner company" />
        </label>
        <label className="grid gap-2 text-sm font-medium text-ink">
          Country
          <input className="hsv-control" defaultValue={vessel?.country ?? ""} placeholder="Panama, Ecuador, etc." />
        </label>
        <label className="grid gap-2 text-sm font-medium text-ink">
          Home port
          <input className="hsv-control" defaultValue={vessel?.homePort ?? ""} placeholder="Enter home port" />
        </label>
        <label className="grid gap-2 text-sm font-medium text-ink">
          Capacity tons
          <input className="hsv-control" defaultValue={vessel?.capacityTons ?? ""} inputMode="numeric" placeholder="0" />
        </label>
        <label className="grid gap-2 text-sm font-medium text-ink">
          Current campaign
          <input className="hsv-control" defaultValue={vessel?.campaign ?? ""} placeholder="Enter campaign" />
        </label>
        <label className="grid gap-2 text-sm font-medium text-ink">
          Assigned helicopter
          <select className="hsv-control" defaultValue={vessel?.assignedHelicopter ?? "Unassigned"}>
            <option>Unassigned</option>
            {helicopters.map((helicopter) => (
              <option key={helicopter.registration}>{helicopter.registration}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-medium text-ink">
          Status
          <select className="hsv-control" defaultValue={vessel?.status ?? "Prospect"}>
            <option>Prospect</option>
            <option>Active</option>
            <option>Inactive</option>
            <option>Archived</option>
            <option>Demo</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-medium text-ink sm:col-span-2">
          Notes
          <textarea className="hsv-textarea" defaultValue={vessel?.notes ?? ""} placeholder="Enter operational notes, assignment context, and source of truth." />
        </label>
      </div>

      <MockFormActions submitLabel={mode === "create" ? "Simulate vessel create" : "Simulate vessel update"} />
    </Panel>
  );
}
