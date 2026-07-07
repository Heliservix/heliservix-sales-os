import { AlertTriangle } from "lucide-react";
import { StatusPill } from "@/components/ui/status-pill";

export function DemoDataBanner() {
  return (
    <section className="border-b border-aviation-amber/25 bg-aviation-amber/10 px-4 py-3 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1500px] flex-col gap-3 text-sm text-ink sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-aviation-amber" aria-hidden="true" />
          <p className="leading-6">
            <strong>Demo Data:</strong> Demo records are for interface testing only. Real fleet, vessel, and component data must be imported or entered by HeliServiX.
          </p>
        </div>
        <StatusPill tone="amber" className="shrink-0">
          No backend connected
        </StatusPill>
      </div>
    </section>
  );
}
