"use client";

import { primaryNavigation } from "@/lib/navigation";
import { StatusPill } from "@/components/ui/status-pill";
import { useI18n } from "@/components/i18n/i18n-provider";
import { BrandLockup } from "@/components/brand/brand-lockup";
import { usePathname } from "next/navigation";

export function Sidebar() {
  const pathname = usePathname();
  const { t } = useI18n();

  return (
    <aside className="hidden w-80 shrink-0 border-r border-brand-blue/20 bg-brand-navy px-4 py-5 text-white shadow-2xl shadow-brand-navy/18 lg:flex lg:flex-col">
      <div className="mb-8 rounded-xl border border-white/10 bg-white/[0.04] p-3">
        <BrandLockup variant="sidebar" />
      </div>

      <nav className="flex-1 space-y-1" aria-label={t("shell.module")}>
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
                  ? "bg-brand-blue text-white shadow-control"
                  : "text-white/70 hover:bg-white/[0.08] hover:text-white"
              ].join(" ")}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate">{t(item.labelKey)}</span>
              {item.status === "ready" ? (
                <span className="h-1.5 w-1.5 rounded-full bg-status-green" aria-label={t("status.ready")} />
              ) : null}
            </a>
          );
        })}
      </nav>

      <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.04] p-4">
        <StatusPill tone="teal">{t("shell.mvp")}</StatusPill>
        <p className="mt-3 text-sm font-medium text-white">{t("shell.active")}</p>
        <p className="mt-1 text-xs leading-5 text-white/62">
          {t("shell.summary")}
        </p>
      </div>
    </aside>
  );
}
