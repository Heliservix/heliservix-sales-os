import type { Vessel } from "@/types/fleet";
import { StatusPill } from "@/components/ui/status-pill";

type VesselsTableProps = {
  vessels: Vessel[];
};

export function VesselsTable({ vessels }: VesselsTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-line">
      <table className="w-full min-w-[980px] border-collapse text-left text-sm">
        <thead className="bg-canvas-muted text-xs uppercase text-ink-subtle">
          <tr>
            <th className="px-4 py-3 font-semibold">Vessel</th>
            <th className="px-4 py-3 font-semibold">Owner</th>
            <th className="px-4 py-3 font-semibold">Country</th>
            <th className="px-4 py-3 font-semibold">Home Port</th>
            <th className="px-4 py-3 font-semibold">Capacity</th>
            <th className="px-4 py-3 font-semibold">Campaign</th>
            <th className="px-4 py-3 font-semibold">Assigned Helicopter</th>
            <th className="px-4 py-3 font-semibold">Status</th>
            <th className="px-4 py-3 font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line bg-white/52 dark:bg-canvas-muted/36">
          {vessels.map((vessel) => (
            <tr key={vessel.id}>
              <td className="px-4 py-3">
                <a className="font-semibold text-ink hover:text-aviation-teal" href={`/vessels/${vessel.id}`}>
                  {vessel.name}
                </a>
              </td>
              <td className="px-4 py-3 text-ink-muted">{vessel.owner}</td>
              <td className="px-4 py-3 text-ink-muted">{vessel.country}</td>
              <td className="px-4 py-3 text-ink-muted">{vessel.homePort}</td>
              <td className="px-4 py-3 font-medium text-ink">{vessel.capacityTons.toLocaleString()} tons</td>
              <td className="px-4 py-3 text-ink-muted">{vessel.campaign}</td>
              <td className="px-4 py-3 text-ink-muted">{vessel.assignedHelicopter ?? "Unassigned"}</td>
              <td className="px-4 py-3">
                <StatusPill tone="amber">{vessel.status}</StatusPill>
              </td>
              <td className="px-4 py-3">
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
