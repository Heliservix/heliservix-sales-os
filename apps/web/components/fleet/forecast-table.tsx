import type { MaintenanceForecast } from "@/types/fleet";
import { StatusPill } from "@/components/ui/status-pill";

type ForecastTableProps = {
  forecasts: MaintenanceForecast[];
};

export function ForecastTable({ forecasts }: ForecastTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-line">
      <table className="w-full min-w-[960px] border-collapse text-left text-sm">
        <thead className="bg-canvas-muted text-xs uppercase text-ink-subtle">
          <tr>
            <th className="px-4 py-3 font-semibold">Aircraft</th>
            <th className="px-4 py-3 font-semibold">Component</th>
            <th className="px-4 py-3 font-semibold">Horizon</th>
            <th className="px-4 py-3 font-semibold">Trend</th>
            <th className="px-4 py-3 font-semibold">Due</th>
            <th className="px-4 py-3 font-semibold">Exposure</th>
            <th className="px-4 py-3 font-semibold">Reserve</th>
            <th className="px-4 py-3 font-semibold">Procurement</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line bg-white/52 dark:bg-canvas-muted/36">
          {forecasts.map((forecast) => (
            <tr key={forecast.id}>
              <td className="px-4 py-3 font-semibold text-ink">{forecast.helicopterRegistration}</td>
              <td className="px-4 py-3 text-ink-muted">{forecast.componentName}</td>
              <td className="px-4 py-3 text-ink-muted">{forecast.horizon}</td>
              <td className="px-4 py-3 text-ink-muted">{forecast.monthlyHourTrend} hrs/mo</td>
              <td className="px-4 py-3 font-medium text-ink">{forecast.estimatedDueDate}</td>
              <td className="px-4 py-3 text-ink-muted">{forecast.exposure}</td>
              <td className="px-4 py-3 font-medium text-ink">{forecast.reserveRequired}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-ink-muted">{forecast.procurementTiming}</span>
                  <StatusPill tone={forecast.confidence === "High" ? "green" : forecast.confidence === "Medium" ? "amber" : "red"}>
                    {forecast.confidence}
                  </StatusPill>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
