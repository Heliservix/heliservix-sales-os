"use client";

import { memo } from "react";
import Image from "next/image";
import { brand } from "@/lib/brand";
import { useI18n } from "@/components/i18n/i18n-provider";

type BrandLockupProps = {
  variant?: "sidebar" | "topbar" | "hero" | "compact";
};

function BrandLockupComponent({ variant = "topbar" }: BrandLockupProps) {
  const { t } = useI18n();
  const isHero = variant === "hero";
  const isSidebar = variant === "sidebar";
  const isCompact = variant === "compact";

  return (
    <div className={["flex min-w-0 items-center", isHero ? "gap-5" : "gap-3"].join(" ")}>
      <div
        className={[
          "flex shrink-0 items-center justify-center rounded-lg bg-white shadow-control",
          isHero ? "h-20 w-64 px-4" : isCompact ? "h-10 w-32 px-2.5" : "h-12 w-40 px-3",
          isSidebar ? "ring-1 ring-white/18" : "border border-line"
        ].join(" ")}
      >
        <Image
          alt={brand.logo.alt}
          className="h-auto w-full object-contain"
          height={brand.logo.height}
          priority={isHero || isSidebar}
          src={brand.logo.src}
          width={brand.logo.width}
        />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={[
              "rounded-md border px-2.5 py-1 text-xs font-bold tracking-[0.22em]",
              isHero ? "text-sm" : "",
              isSidebar ? "border-white/24 bg-white/10 text-white" : "border-aviation-blue/20 bg-aviation-blue/10 text-aviation-blue"
            ].join(" ")}
          >
            OS
          </span>
        </div>
        {!isCompact ? (
          <p className={["mt-1 truncate text-xs font-medium", isSidebar ? "text-white/68" : "text-ink-subtle"].join(" ")}>
            {t("brand.subtitle")}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export const BrandLockup = memo(BrandLockupComponent);
