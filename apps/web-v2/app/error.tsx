"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { TopNav } from "@/components/layout/top-nav";
import { Panel } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status-pill";
import { useI18n } from "@/components/i18n/i18n-provider";

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

// Deliberately renders Sidebar/TopNav directly instead of <AppShell> —
// error.tsx is a required Next.js Client Component (error boundaries can't
// be Server Components), and AppShell now fetches the session server-side
// (getSessionUser, for role-based nav) which pulls in next/headers. That's
// only valid inside a Server Component's import graph; importing AppShell
// from here broke the production build ("You're importing a module that
// depends on next/headers... in the Pages Router"). Sidebar/TopNav
// themselves have no server-only dependency, so they're safe here — just
// passed restrictToMechanic={false} since there's no session to check from
// a client error boundary (an error page showing the full nav briefly is a
// harmless default, not a security issue — the real gate is middleware.ts).
export default function Error({ error, reset }: ErrorProps) {
  const { tx } = useI18n();
  return (
    <div className="min-h-screen lg:flex">
      <Sidebar restrictToMechanic={false} />
      <div className="min-w-0 flex-1 lg:pl-0">
        <TopNav restrictToMechanic={false} />
        <main className="px-4 py-5 sm:px-6 lg:px-8 lg:py-7 print:p-0">
          <div className="mx-auto max-w-[900px]">
            <Panel>
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg border border-aviation-red/20 bg-aviation-red/10 text-aviation-red">
                  <AlertTriangle className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <StatusPill tone="red">{tx("Error")}</StatusPill>
                  <h1 className="mt-4 text-2xl font-semibold text-ink">{tx("This workspace could not be loaded.")}</h1>
                  <p className="mt-3 text-sm leading-6 text-ink-subtle">
                    {tx("Retry the local workspace. If the problem continues, preserve the current localStorage data and review the browser console.")}
                  </p>
                  {error.digest ? (
                    <p className="mt-3 rounded-md border border-line bg-canvas-muted/60 px-3 py-2 text-xs font-medium text-ink-subtle">
                      {tx("Error reference")}: {error.digest}
                    </p>
                  ) : null}
                  <button className="hsv-primary-button mt-5" type="button" onClick={reset}>
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                    {tx("Try again")}
                  </button>
                </div>
              </div>
            </Panel>
          </div>
        </main>
      </div>
    </div>
  );
}
