"use client";

import { primaryNavigation } from "@/lib/navigation";
import { StatusPill } from "@/components/ui/status-pill";
import { usePathname } from "next/navigation";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-72 shrink-0 border-r border-line bg-white/74 px-4 py-5 backdrop-blur-xl dark:bg-canvas-muted/70 lg:flex lg:flex-col">
      <div className="mb-8 flex items-center gap-3 px-2">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-ink text-sm font-semibold text-white shadow-control dark:bg-white dark:text-ink">
          HX
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">HeliServiX</p>
          <p className="truncate text-xs text-ink-subtle">Fleet & Maintenance</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1" aria-label="Primary navigation">
        {primaryNavigation.map((item) => {
          const Icon = item.icon;
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

          return (
            <a
              key={item.label}
              href={item.href}
              className={[
                "group flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition",
                isActive
                  ? "bg-ink text-white shadow-control dark:bg-white dark:text-ink"
                  : "text-ink-muted hover:bg-canvas-muted hover:text-ink dark:hover:bg-white/6"
              ].join(" ")}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              {item.status === "ready" ? (
                <span className="h-1.5 w-1.5 rounded-full bg-aviation-green" aria-label="Ready" />
              ) : null}
            </a>
          );
        })}
      </nav>

      <div className="mt-6 rounded-lg border border-line bg-canvas-muted/72 p-4">
        <StatusPill tone="teal">EPIC 001 MVP</StatusPill>
        <p className="mt-3 text-sm font-medium text-ink">Fleet operations active</p>
        <p className="mt-1 text-xs leading-5 text-ink-subtle">
          Multi-helicopter readiness, component exposure, alerts, and forecast surfaces are ready for review.
        </p>
      </div>
    </aside>
  );
}
