import type { LucideIcon } from "lucide-react";
import { StatusPill } from "@/components/ui/status-pill";

type PageHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
  status?: string;
};

export function PageHeader({ eyebrow, title, description, icon: Icon, status }: PageHeaderProps) {
  return (
    <section className="mb-6 rounded-lg border border-line bg-white/76 p-6 shadow-panel backdrop-blur-xl dark:bg-canvas-muted/72 lg:p-7">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-line bg-canvas-muted text-ink">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </div>
            <StatusPill tone="teal">{eyebrow}</StatusPill>
          </div>
          <h1 className="mt-5 max-w-5xl text-3xl font-semibold tracking-normal text-ink sm:text-4xl">
            {title}
          </h1>
          <p className="mt-3 max-w-4xl text-base leading-7 text-ink-muted">{description}</p>
        </div>
        {status ? (
          <div className="rounded-lg border border-line bg-canvas-muted/70 px-4 py-3">
            <p className="text-xs font-semibold uppercase text-ink-subtle">Current module state</p>
            <p className="mt-1 text-sm font-semibold text-ink">{status}</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
