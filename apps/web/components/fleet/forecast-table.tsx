import type { MaintenanceForecast } from "@/types/fleet";
import { StatusPill } from "@/components/ui/status-pill";

type ForecastTableProps = {
  forecasts: MaintenanceForecast[];
};

export function ForecastTable({ forecasts }: ForecastTableProps) {
  return (
    <div className="hsv-table-wrap">
      <table className="hsv-table min-w-[960px]">
        <thead className="hsv-table-head">
          <tr>
            <th className="hsv-table-th">Aircraft</th>
            <th className="hsv-table-th">Component</th>
            <th className="hsv-table-th">Horizon</th>
            <th className="hsv-table-th">Trend</th>
            <th className="hsv-table-th">Due</th>
            <th className="hsv-table-th">Exposure</th>
            <th className="hsv-table-th">Reserve</th>
            <th className="hsv-table-th">Procurement</th>
          </tr>
        </thead>
        <tbody className="hsv-table-body">
          {forecasts.map((forecast) => (
            <tr key={forecast.id}>
              <td className="hsv-table-cell font-semibold text-ink">{forecast.helicopterRegistration}</td>
              <td className="hsv-table-cell text-ink-muted">{forecast.componentName}</td>
              <td className="hsv-table-cell text-ink-muted">{forecast.horizon}</td>
              <td className="hsv-table-cell text-ink-muted">{forecast.monthlyHourTrend} hrs/mo</td>
              <td className="hsv-table-cell font-medium text-ink">{forecast.estimatedDueDate}</td>
              <td className="hsv-table-cell text-ink-muted">{forecast.exposure}</td>
              <td className="hsv-table-cell font-medium text-ink">{forecast.reserveRequired}</td>
              <td className="hsv-table-cell">
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
