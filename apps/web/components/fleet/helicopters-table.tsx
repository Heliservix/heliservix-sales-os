import type { Helicopter } from "@/types/fleet";
import { StatusPill } from "@/components/ui/status-pill";
import { helicopterTone } from "@/components/fleet/status-utils";

type HelicoptersTableProps = {
  helicopters: Helicopter[];
};

export function HelicoptersTable({ helicopters }: HelicoptersTableProps) {
  return (
    <div className="hsv-table-wrap">
      <table className="hsv-table min-w-[920px]">
        <thead className="hsv-table-head">
          <tr>
            <th className="hsv-table-th">Registration</th>
            <th className="hsv-table-th">Model</th>
            <th className="hsv-table-th">Serial</th>
            <th className="hsv-table-th">Hourmeter</th>
            <th className="hsv-table-th">Status</th>
            <th className="hsv-table-th">Assigned Vessel</th>
            <th className="hsv-table-th">Area</th>
            <th className="hsv-table-th">Next Due</th>
            <th className="hsv-table-th">Actions</th>
          </tr>
        </thead>
        <tbody className="hsv-table-body">
          {helicopters.map((helicopter) => (
            <tr key={helicopter.registration}>
              <td className="hsv-table-cell">
                <a className="font-semibold text-ink hover:text-aviation-teal" href={`/helicopters/${helicopter.registration}`}>
                  {helicopter.registration}
                </a>
              </td>
              <td className="hsv-table-cell text-ink-muted">{helicopter.model}</td>
              <td className="hsv-table-cell text-ink-muted">{helicopter.serialNumber}</td>
              <td className="hsv-table-cell font-medium text-ink">{helicopter.currentHourmeter.toFixed(1)}</td>
              <td className="hsv-table-cell">
                <StatusPill tone={helicopterTone(helicopter.status)}>{helicopter.status}</StatusPill>
              </td>
              <td className="hsv-table-cell text-ink-muted">{helicopter.assignedVessel ?? "Unassigned"}</td>
              <td className="hsv-table-cell text-ink-muted">{helicopter.operationArea}</td>
              <td className="hsv-table-cell text-ink-muted">{helicopter.nextDueComponent}</td>
              <td className="hsv-table-cell">
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
