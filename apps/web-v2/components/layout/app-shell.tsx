import { Sidebar } from "@/components/layout/sidebar";
import { TopNav } from "@/components/layout/top-nav";
import { getSessionUser } from "@/lib/auth";

type AppShellProps = {
  children: React.ReactNode;
};

// Async Server Component — every page that renders <AppShell> is itself a
// Server Component, so React/Next.js awaits this as part of the tree with
// no changes needed at any of those call sites. Fetches the session once
// here so Sidebar/TopNav (both Client Components) can filter nav items by
// role instead of hiding-via-CSS or duplicating the lookup themselves. A
// Mecánico only ever reaches AppShell pages middleware already lets them
// into, so this filtering is a UX nicety on top of the real gate in
// middleware.ts — not the security boundary itself.
export async function AppShell({ children }: AppShellProps) {
  const session = await getSessionUser();
  const restrictToMechanic = Boolean(session && !session.isAdmin && session.personnelRole === "Mecánico");

  return (
    <div className="min-h-screen lg:flex">
      <Sidebar restrictToMechanic={restrictToMechanic} />
      <div className="min-w-0 flex-1 lg:pl-0">
        <TopNav restrictToMechanic={restrictToMechanic} />
        <main className="px-4 py-5 sm:px-6 lg:px-8 lg:py-7 print:p-0">{children}</main>
      </div>
    </div>
  );
}
