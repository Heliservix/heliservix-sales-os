"use client";

import type { LucideIcon } from "lucide-react";
import { StatusPill } from "@/components/ui/status-pill";
import { useI18n } from "@/components/i18n/i18n-provider";

type PageHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
  status?: string;
};

export function PageHeader({ eyebrow, title, description, icon: Icon, status }: PageHeaderProps) {
  const { tx } = useI18n();
  return (
    <section className="mb-6 overflow-hidden rounded-xl border border-line bg-white shadow-panel backdrop-blur-xl dark:bg-canvas-muted/72">
      <div className="h-1 bg-gradient-to-r from-brand-blue via-brand-blue/70 to-brand-lightBlue" />
      <div className="p-5 sm:p-6 lg:p-7">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-aviation-blue/15 bg-brand-lightBlue text-aviation-blue">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </div>
            <StatusPill tone="teal">{tx(eyebrow)}</StatusPill>
          </div>
          <h1 className="mt-5 max-w-5xl text-3xl font-semibold tracking-normal text-ink sm:text-4xl">
            {tx(title)}
          </h1>
          <p className="mt-3 max-w-4xl text-base leading-7 text-ink-muted">{tx(description)}</p>
        </div>
        {status ? (
          <div className="rounded-lg border border-line bg-canvas-muted/70 px-4 py-3">
            <p className="text-xs font-semibold uppercase text-ink-subtle">{tx("Current module state")}</p>
            <p className="mt-1 text-sm font-semibold text-ink">{tx(status)}</p>
          </div>
        ) : null}
      </div>
      </div>
    </section>
  );
}
