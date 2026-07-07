"use client";

import { Bell, Command, Moon, Search, ShieldCheck } from "lucide-react";
import { primaryNavigation, quickActions } from "@/lib/navigation";
import { usePathname, useRouter } from "next/navigation";

export function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const activeHref =
    primaryNavigation.find((item) => item.href !== "/" && pathname.startsWith(item.href))?.href ?? "/";

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-canvas/82 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="lg:hidden">
            <label htmlFor="mobile-module" className="sr-only">
              Module
            </label>
            <select
              id="mobile-module"
              className="h-10 rounded-md border border-line bg-white px-3 text-sm font-medium text-ink shadow-control outline-none dark:bg-canvas-muted"
              value={activeHref}
              onChange={(event) => router.push(event.target.value)}
            >
              {primaryNavigation.map((item) => (
                <option key={item.label} value={item.href}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div className="hidden h-10 min-w-0 flex-1 max-w-xl items-center gap-3 rounded-md border border-line bg-white px-3 shadow-control dark:bg-canvas-muted md:flex">
            <Search className="h-4 w-4 text-ink-subtle" aria-hidden="true" />
            <span className="truncate text-sm text-ink-subtle">
              Search demo helicopters, vessels, components, campaigns, or alerts
            </span>
            <span className="ml-auto inline-flex items-center gap-1 rounded border border-line px-1.5 py-0.5 text-[11px] font-medium text-ink-subtle">
              <Command className="h-3 w-3" aria-hidden="true" /> K
            </span>
          </div>
        </div>

        <div className="hidden items-center gap-2 2xl:flex">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                className="inline-flex h-10 items-center gap-2 rounded-md border border-line bg-white px-3 text-sm font-medium text-ink-muted shadow-control transition hover:text-ink dark:bg-canvas-muted"
                type="button"
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {action.label}
              </button>
            );
          })}
        </div>

        <button
          className="grid h-10 w-10 place-items-center rounded-md border border-line bg-white text-ink-muted shadow-control transition hover:text-ink dark:bg-canvas-muted"
          type="button"
          aria-label="Dark mode ready"
        >
          <Moon className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          className="grid h-10 w-10 place-items-center rounded-md border border-line bg-white text-ink-muted shadow-control transition hover:text-ink dark:bg-canvas-muted"
          type="button"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" aria-hidden="true" />
        </button>
        <div className="hidden h-10 items-center gap-2 rounded-md border border-line bg-white px-3 shadow-control dark:bg-canvas-muted 2xl:flex">
          <ShieldCheck className="h-4 w-4 text-aviation-teal" aria-hidden="true" />
          <span className="text-sm font-medium text-ink">Fleet Ops</span>
        </div>
      </div>
    </header>
  );
}
