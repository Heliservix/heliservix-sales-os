import type { Vessel } from "@/types/fleet";
import { StatusPill } from "@/components/ui/status-pill";

type VesselsTableProps = {
  vessels: Vessel[];
};

export function VesselsTable({ vessels }: VesselsTableProps) {
  return (
    <div className="hsv-table-wrap">
      <table className="hsv-table min-w-[980px]">
        <thead className="hsv-table-head">
          <tr>
            <th className="hsv-table-th">Vessel</th>
            <th className="hsv-table-th">Owner</th>
            <th className="hsv-table-th">Country</th>
            <th className="hsv-table-th">Home Port</th>
            <th className="hsv-table-th">Capacity</th>
            <th className="hsv-table-th">Campaign</th>
            <th className="hsv-table-th">Assigned Helicopter</th>
            <th className="hsv-table-th">Status</th>
            <th className="hsv-table-th">Actions</th>
          </tr>
        </thead>
        <tbody className="hsv-table-body">
          {vessels.map((vessel) => (
            <tr key={vessel.id}>
              <td className="hsv-table-cell">
                <a className="font-semibold text-ink hover:text-aviation-teal" href={`/vessels/${vessel.id}`}>
                  {vessel.name}
                </a>
              </td>
              <td className="hsv-table-cell text-ink-muted">{vessel.owner}</td>
              <td className="hsv-table-cell text-ink-muted">{vessel.country}</td>
              <td className="hsv-table-cell text-ink-muted">{vessel.homePort}</td>
              <td className="hsv-table-cell font-medium text-ink">{vessel.capacityTons.toLocaleString()} tons</td>
              <td className="hsv-table-cell text-ink-muted">{vessel.campaign}</td>
              <td className="hsv-table-cell text-ink-muted">{vessel.assignedHelicopter ?? "Unassigned"}</td>
              <td className="hsv-table-cell">
                <StatusPill tone="amber">{vessel.status}</StatusPill>
              </td>
              <td className="hsv-table-cell">
                <a className="font-semibold text-aviation-teal hover:text-ink" href={`/vessels/${vessel.id}/edit`}>
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
