import { memo } from "react";
import type { LucideIcon } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status-pill";

type TimelineItem = {
  title: string;
  description: string;
  time: string;
  icon: LucideIcon;
  tone: "green" | "amber" | "blue" | "teal";
};

type TimelineProps = {
  items: TimelineItem[];
};

function TimelineComponent({ items }: TimelineProps) {
  return (
    <Panel>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-ink">Operational timeline</h2>
          <p className="mt-1 text-sm text-ink-subtle">Commercial and aviation signals for today.</p>
        </div>
        <StatusPill>Live view</StatusPill>
      </div>
      <div className="mt-5 space-y-5">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="flex gap-4">
              <div className="mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-line bg-canvas-muted">
                <Icon className="h-4 w-4 text-ink-muted" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-sm font-semibold text-ink">{item.title}</h3>
                  <span className="shrink-0 text-xs font-medium text-ink-subtle">{item.time}</span>
                </div>
                <p className="mt-1 text-sm leading-6 text-ink-subtle">{item.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

export const Timeline = memo(TimelineComponent);
