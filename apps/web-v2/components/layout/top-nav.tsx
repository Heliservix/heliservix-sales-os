"use client";

import { ShieldCheck } from "lucide-react";
import { primaryNavigation } from "@/lib/navigation";
import { languages } from "@/lib/i18n";
import { useI18n } from "@/components/i18n/i18n-provider";
import { BrandLockup } from "@/components/brand/brand-lockup";
import { LogoutButton } from "@/components/layout/logout-button";
import { usePathname, useRouter } from "next/navigation";

export function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { language, setLanguage, t } = useI18n();
  const readyNavigation = primaryNavigation.filter((item) => item.status !== "planned");
  const activeHref =
    readyNavigation.find((item) => item.href !== "/" && pathname.startsWith(item.href))?.href ?? "/";

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-white/94 px-4 py-3 shadow-sm backdrop-blur-xl sm:px-6 lg:px-8">
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="min-w-0 lg:hidden">
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
              {readyNavigation.map((item) => (
                <option key={item.label} value={item.href}>
                  {t(item.labelKey)}
                </option>
              ))}
            </select>
          </div>
          <p className="hidden truncate text-sm font-semibold text-ink-muted lg:block">
            {t("shell.active")}
          </p>
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

        <div className="hidden h-10 items-center gap-2 rounded-md border border-line bg-white px-3 shadow-control dark:bg-canvas-muted xl:flex">
          <ShieldCheck className="h-4 w-4 text-aviation-teal" aria-hidden="true" />
          <span className="text-sm font-medium text-ink">{t("shell.fleetOps")}</span>
        </div>

        <LogoutButton />
      </div>
    </header>
  );
}
