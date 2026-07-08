"use client";

import { cn } from "@/lib/utils";
import { useI18n } from "@/components/i18n/i18n-provider";

type StatusPillProps = {
  children: React.ReactNode;
  tone?: "green" | "amber" | "blue" | "teal" | "red" | "neutral";
  className?: string;
};

const toneClasses = {
  green: "border-aviation-green/25 bg-aviation-green/10 text-aviation-green",
  amber: "border-aviation-amber/30 bg-aviation-amber/10 text-aviation-amber",
  blue: "border-aviation-blue/25 bg-aviation-blue/10 text-aviation-blue",
  teal: "border-aviation-teal/25 bg-aviation-teal/10 text-aviation-teal",
  red: "border-aviation-red/25 bg-aviation-red/10 text-aviation-red",
  neutral: "border-line bg-canvas-muted text-ink-muted"
};

export function StatusPill({ children, tone = "neutral", className }: StatusPillProps) {
  const { tx } = useI18n();
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
        "whitespace-nowrap leading-none shadow-control",
        toneClasses[tone],
        className
      )}
    >
      {typeof children === "string" ? tx(children) : children}
    </span>
  );
}
