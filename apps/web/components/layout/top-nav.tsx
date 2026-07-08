"use client";

import { Bell, Command, Moon, Search, ShieldCheck } from "lucide-react";
import { primaryNavigation, quickActions } from "@/lib/navigation";
import { languages } from "@/lib/i18n";
import { useI18n } from "@/components/i18n/i18n-provider";
import { BrandLockup } from "@/components/brand/brand-lockup";
import { usePathname, useRouter } from "next/navigation";

export function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { language, setLanguage, t } = useI18n();
  const activeHref =
    primaryNavigation.find((item) => item.href !== "/" && pathname.startsWith(item.href))?.href ?? "/";

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-white/94 px-4 py-3 shadow-sm backdrop-blur-xl sm:px-6 lg:px-8">
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="min-w-0">
            <BrandLockup variant="compact" />
          </div>
          <div className="hidden min-w-[13rem] md:block lg:hidden">
            <label htmlFor="mobile-module" className="sr-only">
              {t("shell.module")}
            </label>
            <select
              id="mobile-module"
              className="hsv-control"
              value={activeHref}
              onChange={(event) => router.push(event.target.value)}
            >
              {primaryNavigation.map((item) => (
                <option key={item.label} value={item.href}>
                  {t(item.labelKey)}
                </option>
              ))}
            </select>
          </div>

          <div className="hidden h-10 min-w-0 flex-1 max-w-xl items-center gap-3 rounded-md border border-line bg-white px-3 shadow-control transition hover:border-aviation-blue/30 dark:bg-canvas-muted xl:flex">
            <Search className="h-4 w-4 text-ink-subtle" aria-hidden="true" />
            <span className="truncate text-sm text-ink-subtle">
              {t("shell.search")}
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
                className="hsv-secondary-button px-3"
                type="button"
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {t(action.labelKey)}
              </button>
            );
          })}
        </div>

        <label className="sr-only" htmlFor="language-select">{t("shell.language")}</label>
        <select
          id="language-select"
          className="h-10 rounded-md border border-line bg-white px-2 text-sm font-semibold text-ink-muted shadow-control outline-none transition hover:border-aviation-blue/35 hover:text-ink focus:border-aviation-blue focus:ring-4 focus:ring-aviation-blue/10 dark:bg-canvas-muted"
          value={language}
          onChange={(event) => setLanguage(event.target.value === "es" ? "es" : "en")}
        >
          {languages.map((item) => (
            <option key={item.code} value={item.code}>{item.label}</option>
          ))}
        </select>

        <button
          className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-line bg-white text-ink-muted shadow-control transition hover:border-aviation-blue/35 hover:text-ink dark:bg-canvas-muted"
          type="button"
          aria-label={t("shell.darkMode")}
        >
          <Moon className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-line bg-white text-ink-muted shadow-control transition hover:border-aviation-blue/35 hover:text-ink dark:bg-canvas-muted"
          type="button"
          aria-label={t("shell.notifications")}
        >
          <Bell className="h-4 w-4" aria-hidden="true" />
        </button>
        <div className="hidden h-10 items-center gap-2 rounded-md border border-line bg-white px-3 shadow-control dark:bg-canvas-muted 2xl:flex">
          <ShieldCheck className="h-4 w-4 text-aviation-teal" aria-hidden="true" />
          <span className="text-sm font-medium text-ink">{t("shell.fleetOps")}</span>
        </div>
      </div>
    </header>
  );
}
