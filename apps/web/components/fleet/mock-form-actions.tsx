"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { StatusPill } from "@/components/ui/status-pill";

type MockFormActionsProps = {
  submitLabel: string;
};

export function MockFormActions({ submitLabel }: MockFormActionsProps) {
  const [saved, setSaved] = useState(false);

  return (
    <div className="mt-6 flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2 text-sm text-ink-subtle">
        {saved ? <CheckCircle2 className="h-4 w-4 text-aviation-green" aria-hidden="true" /> : null}
        <span>{saved ? "Simulated save complete. No backend changes were made." : "Frontend-only simulation. Data is not persisted."}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        <StatusPill tone="amber">Demo Data</StatusPill>
        <button
          className="hsv-primary-button"
          type="button"
          onClick={() => setSaved(true)}
        >
          {submitLabel}
        </button>
      </div>
    </div>
  );
}
