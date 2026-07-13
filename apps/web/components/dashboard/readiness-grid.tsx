import { memo } from "react";
import type { LucideIcon } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status-pill";

type ReadinessSignal = {
  label: string;
  value: string;
  description: string;
  icon: LucideIcon;
  tone: "green" | "amber" | "blue" | "teal";
};

type ReadinessGridProps = {
  signals: ReadinessSignal[];
};

function ReadinessGridComponent({ signals }: ReadinessGridProps) {
  return (
    <Panel>
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-ink">Readiness signals</h2>
        <p className="mt-1 text-sm text-ink-subtle">
          A unified view of commercial confidence and operational constraints.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {signals.map((signal) => {
          const Icon = signal.icon;
          return (
            <article key={signal.label} className="rounded-lg border border-line bg-canvas-muted/60 p-4">
              <div className="flex items-start justify-between gap-3">
                <Icon className="h-5 w-5 text-ink-muted" aria-hidden="true" />
                <StatusPill tone={signal.tone}>{signal.value}</StatusPill>
              </div>
              <h3 className="mt-4 text-sm font-semibold text-ink">{signal.label}</h3>
              <p className="mt-2 text-sm leading-6 text-ink-subtle">{signal.description}</p>
            </article>
          );
        })}
      </div>
    </Panel>
  );
}

export const ReadinessGrid = memo(ReadinessGridComponent);
