"use client";

import { AlertTriangle } from "lucide-react";
import { StatusPill } from "@/components/ui/status-pill";
import { useI18n } from "@/components/i18n/i18n-provider";

export function DemoDataBanner() {
  const { t } = useI18n();
  return (
    <section className="border-b border-aviation-amber/25 bg-aviation-amber/10 px-4 py-3 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1500px] flex-col gap-3 text-sm text-ink sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-aviation-amber" aria-hidden="true" />
          <p className="leading-6">
            <strong>{t("shell.demoTitle")}</strong> {t("shell.demoPolicy")}
          </p>
        </div>
        <StatusPill tone="amber" className="shrink-0">
          {t("shell.noBackend")}
        </StatusPill>
      </div>
    </section>
  );
}
