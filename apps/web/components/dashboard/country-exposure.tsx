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

      <div className="overflow-hidden rounded-lg border border-line">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-canvas-muted text-xs uppercase text-ink-subtle">
            <tr>
              <th className="px-4 py-3 font-semibold">Country</th>
              <th className="px-4 py-3 font-semibold">Accounts</th>
              <th className="px-4 py-3 font-semibold">Value</th>
              <th className="px-4 py-3 font-semibold">Signal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line bg-white/52 dark:bg-canvas-muted/36">
            {rows.map((row) => (
              <tr key={row.country}>
                <td className="px-4 py-3 font-medium text-ink">{row.country}</td>
                <td className="px-4 py-3 text-ink-muted">{row.accounts}</td>
                <td className="px-4 py-3 font-medium text-ink">{row.value}</td>
                <td className="px-4 py-3 text-ink-muted">{row.level}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
