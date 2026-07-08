import type { HelicopterComponent } from "@/types/fleet";
import { componentCategories, helicopters } from "@/lib/fleet-data";
import { MockFormActions } from "@/components/fleet/mock-form-actions";
import { Panel } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status-pill";

type ComponentFormProps = {
  mode: "create" | "edit";
  component?: HelicopterComponent;
};

export function ComponentForm({ mode, component }: ComponentFormProps) {
  return (
    <Panel>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-ink">{mode === "create" ? "Add Component" : "Edit Component"}</h2>
          <p className="mt-1 text-sm text-ink-subtle">Component records must come from approved maintenance records or the governed Excel import workflow.</p>
        </div>
        <StatusPill tone="amber">Mock form</StatusPill>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium text-ink">
          Helicopter registration
          <select className="hsv-control" defaultValue={component?.helicopterRegistration ?? "HP1804"}>
            {helicopters.map((helicopter) => (
              <option key={helicopter.registration}>{helicopter.registration}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-medium text-ink">
          Category
          <select className="hsv-control" defaultValue={component?.category ?? "Engine"}>
            {componentCategories.map((category) => (
              <option key={category.id}>{category.name}</option>
            ))}
          </select>
        </label>
        {[
          ["Component name", component?.componentName ?? ""],
          ["Part number", component?.partNumber ?? ""],
          ["Serial number", component?.serialNumber ?? ""],
          ["Position", component?.position ?? ""],
          ["Installation date", component?.installationDate ?? ""],
          ["TSN hours", component?.tsnHours ?? ""],
          ["TSO hours", component?.tsoHours ?? ""],
          ["Life limit hours", component?.lifeLimitHours ?? ""],
          ["Calendar limit date", component?.calendarLimitDate ?? ""]
        ].map(([label, value]) => (
          <label key={label} className="grid gap-2 text-sm font-medium text-ink">
            {label}
            <input className="hsv-control" defaultValue={value} />
          </label>
        ))}
        <label className="grid gap-2 text-sm font-medium text-ink sm:col-span-2">
          Notes
          <textarea className="hsv-textarea" defaultValue={component?.notes ?? ""} />
        </label>
      </div>
      <MockFormActions submitLabel={mode === "create" ? "Simulate component create" : "Simulate component update"} />
    </Panel>
  );
}
