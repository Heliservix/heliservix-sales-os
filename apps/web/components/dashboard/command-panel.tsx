import { memo } from "react";
import type { LucideIcon } from "lucide-react";
import { Panel } from "@/components/ui/panel";

type CommandPanelProps = {
  title: string;
  description: string;
  icon: LucideIcon;
  stats: string[][];
};

function CommandPanelComponent({ title, description, icon: Icon, stats }: CommandPanelProps) {
  return (
    <Panel className="p-0">
      <div className="border-b border-line p-5">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-line bg-canvas-muted text-ink">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-ink">{title}</h3>
            <p className="mt-1 text-sm leading-6 text-ink-subtle">{description}</p>
          </div>
        </div>
      </div>
      <dl className="divide-y divide-line">
        {stats.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-4 px-5 py-3">
            <dt className="text-sm text-ink-muted">{label}</dt>
            <dd className="text-sm font-semibold text-ink">{value}</dd>
          </div>
        ))}
      </dl>
    </Panel>
  );
}

export const CommandPanel = memo(CommandPanelComponent);
