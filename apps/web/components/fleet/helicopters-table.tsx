import type { Helicopter } from "@/types/fleet";
import { StatusPill } from "@/components/ui/status-pill";
import { helicopterTone } from "@/components/fleet/status-utils";

type HelicoptersTableProps = {
  helicopters: Helicopter[];
};

export function HelicoptersTable({ helicopters }: HelicoptersTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-line">
      <table className="w-full min-w-[920px] border-collapse text-left text-sm">
        <thead className="bg-canvas-muted text-xs uppercase text-ink-subtle">
          <tr>
            <th className="px-4 py-3 font-semibold">Registration</th>
            <th className="px-4 py-3 font-semibold">Model</th>
            <th className="px-4 py-3 font-semibold">Serial</th>
            <th className="px-4 py-3 font-semibold">Hourmeter</th>
            <th className="px-4 py-3 font-semibold">Status</th>
            <th className="px-4 py-3 font-semibold">Assigned Vessel</th>
            <th className="px-4 py-3 font-semibold">Area</th>
            <th className="px-4 py-3 font-semibold">Next Due</th>
            <th className="px-4 py-3 font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line bg-white/52 dark:bg-canvas-muted/36">
          {helicopters.map((helicopter) => (
            <tr key={helicopter.registration}>
              <td className="px-4 py-3">
                <a className="font-semibold text-ink hover:text-aviation-teal" href={`/helicopters/${helicopter.registration}`}>
                  {helicopter.registration}
                </a>
              </td>
              <td className="px-4 py-3 text-ink-muted">{helicopter.model}</td>
              <td className="px-4 py-3 text-ink-muted">{helicopter.serialNumber}</td>
              <td className="px-4 py-3 font-medium text-ink">{helicopter.currentHourmeter.toFixed(1)}</td>
              <td className="px-4 py-3">
                <StatusPill tone={helicopterTone(helicopter.status)}>{helicopter.status}</StatusPill>
              </td>
              <td className="px-4 py-3 text-ink-muted">{helicopter.assignedVessel ?? "Unassigned"}</td>
              <td className="px-4 py-3 text-ink-muted">{helicopter.operationArea}</td>
              <td className="px-4 py-3 text-ink-muted">{helicopter.nextDueComponent}</td>
              <td className="px-4 py-3">
                <a className="font-semibold text-aviation-teal hover:text-ink" href={`/helicopters/${helicopter.registration}/edit`}>
                  Edit
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
