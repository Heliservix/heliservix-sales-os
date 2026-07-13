import { memo } from "react";
import type { HelicopterComponent } from "@/types/fleet";
import { StatusPill } from "@/components/ui/status-pill";
import { componentTone } from "@/components/fleet/status-utils";

type ComponentsTableProps = {
  components: HelicopterComponent[];
  compact?: boolean;
};

function ComponentsTableComponent({ components, compact = false }: ComponentsTableProps) {
  return (
    <div className="hsv-table-wrap">
      <table className="hsv-table min-w-[1120px]">
        <thead className="hsv-table-head">
          <tr>
            <th className="hsv-table-th">Aircraft</th>
            <th className="hsv-table-th">Component</th>
            <th className="hsv-table-th">Category</th>
            <th className="hsv-table-th">P/N</th>
            <th className="hsv-table-th">S/N</th>
            <th className="hsv-table-th">Position</th>
            <th className="hsv-table-th">TSO</th>
            <th className="hsv-table-th">Remaining</th>
            <th className="hsv-table-th">Calendar</th>
            <th className="hsv-table-th">%</th>
            <th className="hsv-table-th">Status</th>
            {!compact ? <th className="hsv-table-th">Docs</th> : null}
            {!compact ? <th className="hsv-table-th">Actions</th> : null}
          </tr>
        </thead>
        <tbody className="hsv-table-body">
          {components.map((component) => (
            <tr key={component.id}>
              <td className="hsv-table-cell font-medium text-ink">{component.helicopterRegistration}</td>
              <td className="hsv-table-cell">
                <a className="font-semibold text-ink hover:text-aviation-teal" href={`/components/${component.id}`}>
                  {component.componentName}
                </a>
                <p className="mt-1 text-xs text-ink-subtle">{component.installationDate}</p>
              </td>
              <td className="hsv-table-cell text-ink-muted">{component.category}</td>
              <td className="hsv-table-cell text-ink-muted">{component.partNumber}</td>
              <td className="hsv-table-cell text-ink-muted">{component.serialNumber}</td>
              <td className="hsv-table-cell text-ink-muted">{component.position}</td>
              <td className="hsv-table-cell text-ink-muted">{component.tsoHours.toFixed(1)}</td>
              <td className="hsv-table-cell font-medium text-ink">{component.remainingHours.toFixed(1)} hrs</td>
              <td className="hsv-table-cell text-ink-muted">{component.remainingCalendarDays} days</td>
              <td className="hsv-table-cell text-ink-muted">{component.remainingPercentage.toFixed(1)}%</td>
              <td className="hsv-table-cell">
                <StatusPill tone={componentTone(component.status)}>{component.status}</StatusPill>
              </td>
              {!compact ? <td className="hsv-table-cell text-ink-muted">{component.documents}</td> : null}
              {!compact ? (
                <td className="hsv-table-cell">
                  <a className="font-semibold text-aviation-teal hover:text-ink" href={`/components/${component.id}/edit`}>
                    Edit
                  </a>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export const ComponentsTable = memo(ComponentsTableComponent);
