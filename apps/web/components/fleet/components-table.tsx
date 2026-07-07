import type { HelicopterComponent } from "@/types/fleet";
import { StatusPill } from "@/components/ui/status-pill";
import { componentTone } from "@/components/fleet/status-utils";

type ComponentsTableProps = {
  components: HelicopterComponent[];
  compact?: boolean;
};

export function ComponentsTable({ components, compact = false }: ComponentsTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-line">
      <table className="w-full min-w-[1120px] border-collapse text-left text-sm">
        <thead className="bg-canvas-muted text-xs uppercase text-ink-subtle">
          <tr>
            <th className="px-4 py-3 font-semibold">Aircraft</th>
            <th className="px-4 py-3 font-semibold">Component</th>
            <th className="px-4 py-3 font-semibold">Category</th>
            <th className="px-4 py-3 font-semibold">P/N</th>
            <th className="px-4 py-3 font-semibold">S/N</th>
            <th className="px-4 py-3 font-semibold">Position</th>
            <th className="px-4 py-3 font-semibold">TSO</th>
            <th className="px-4 py-3 font-semibold">Remaining</th>
            <th className="px-4 py-3 font-semibold">Calendar</th>
            <th className="px-4 py-3 font-semibold">%</th>
            <th className="px-4 py-3 font-semibold">Status</th>
            {!compact ? <th className="px-4 py-3 font-semibold">Docs</th> : null}
          </tr>
        </thead>
        <tbody className="divide-y divide-line bg-white/52 dark:bg-canvas-muted/36">
          {components.map((component) => (
            <tr key={component.id}>
              <td className="px-4 py-3 font-medium text-ink">{component.helicopterRegistration}</td>
              <td className="px-4 py-3">
                <a className="font-semibold text-ink hover:text-aviation-teal" href={`/components/${component.id}`}>
                  {component.componentName}
                </a>
                <p className="mt-1 text-xs text-ink-subtle">{component.installationDate}</p>
              </td>
              <td className="px-4 py-3 text-ink-muted">{component.category}</td>
              <td className="px-4 py-3 text-ink-muted">{component.partNumber}</td>
              <td className="px-4 py-3 text-ink-muted">{component.serialNumber}</td>
              <td className="px-4 py-3 text-ink-muted">{component.position}</td>
              <td className="px-4 py-3 text-ink-muted">{component.tsoHours.toFixed(1)}</td>
              <td className="px-4 py-3 font-medium text-ink">{component.remainingHours.toFixed(1)} hrs</td>
              <td className="px-4 py-3 text-ink-muted">{component.remainingCalendarDays} days</td>
              <td className="px-4 py-3 text-ink-muted">{component.remainingPercentage.toFixed(1)}%</td>
              <td className="px-4 py-3">
                <StatusPill tone={componentTone(component.status)}>{component.status}</StatusPill>
              </td>
              {!compact ? <td className="px-4 py-3 text-ink-muted">{component.documents}</td> : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
