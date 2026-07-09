import { AppShell } from "@/components/layout/app-shell";
import { BrandLockup } from "@/components/brand/brand-lockup";
import { Panel } from "@/components/ui/panel";

export default function Loading() {
  return (
    <AppShell>
      <div className="mx-auto grid max-w-[1500px] gap-6">
        <Panel className="overflow-hidden">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <BrandLockup variant="hero" />
            <div className="hsv-skeleton-line h-10 w-full max-w-sm" />
          </div>
          <div className="mt-7 grid gap-3 md:grid-cols-4">
            <div className="hsv-skeleton-line h-24" />
            <div className="hsv-skeleton-line h-24" />
            <div className="hsv-skeleton-line h-24" />
            <div className="hsv-skeleton-line h-24" />
          </div>
        </Panel>
        <Panel>
          <div className="hsv-skeleton-line h-4 w-48" />
          <div className="mt-5 grid gap-3">
            <div className="hsv-skeleton-line h-12" />
            <div className="hsv-skeleton-line h-12" />
            <div className="hsv-skeleton-line h-12" />
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
