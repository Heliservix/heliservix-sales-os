import type { LucideIcon } from "lucide-react";
import { StatusPill } from "@/components/ui/status-pill";

type SectionHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
};

// Server-safe replacement for the old PageHeader. PageHeader is a
// Client Component (it needs "use client" for the i18n hook), and
// Next.js cannot pass a component reference like a Lucide icon as a
// prop from a Server Component into a Client Component — that is what
// caused the "Functions cannot be passed directly to Client
// Components" crash. This component has no client hooks, so it can
// render the icon directly as a Server Component with no boundary to
// cross.
export function SectionHeader({ eyebrow, title, description, icon: Icon }: SectionHeaderProps) {
  return (
    <section className="mb-6 overflow-hidden rounded-xl border border-line bg-white shadow-panel backdrop-blur-xl dark:bg-canvas-muted/72">
      <div className="h-1 bg-gradient-to-r from-brand-blue via-brand-blue/70 to-brand-lightBlue" />
      <div className="p-5 sm:p-6 lg:p-7">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-aviation-blue/15 bg-brand-lightBlue text-aviation-blue">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
          <StatusPill tone="teal">{eyebrow}</StatusPill>
        </div>
        <h1 className="mt-5 max-w-5xl text-3xl font-semibold tracking-normal text-ink sm:text-4xl">{title}</h1>
        <p className="mt-3 max-w-4xl text-base leading-7 text-ink-muted">{description}</p>
      </div>
    </section>
  );
}
