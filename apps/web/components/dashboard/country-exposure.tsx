import { Panel } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status-pill";

type CountryExposure = {
  country: string;
  accounts: number;
  value: string;
  level: string;
};

type CountryExposureProps = {
  rows: CountryExposure[];
};

export function CountryExposure({ rows }: CountryExposureProps) {
  return (
    <Panel>
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-ink">Regional exposure</h2>
          <p className="mt-1 text-sm text-ink-subtle">Priority countries across the Eastern Pacific corridor.</p>
        </div>
        <StatusPill tone="blue">LATAM</StatusPill>
      </div>

      <div className="hsv-table-wrap">
        <table className="hsv-table">
          <thead className="hsv-table-head">
            <tr>
              <th className="hsv-table-th">Country</th>
              <th className="hsv-table-th">Accounts</th>
              <th className="hsv-table-th">Value</th>
              <th className="hsv-table-th">Signal</th>
            </tr>
          </thead>
          <tbody className="hsv-table-body">
            {rows.map((row) => (
              <tr key={row.country}>
                <td className="hsv-table-cell font-medium text-ink">{row.country}</td>
                <td className="hsv-table-cell text-ink-muted">{row.accounts}</td>
                <td className="hsv-table-cell font-medium text-ink">{row.value}</td>
                <td className="hsv-table-cell text-ink-muted">{row.level}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
