import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { LogoutButton } from "@/components/layout/logout-button";
import { ChangePasswordForm } from "@/app/account/change-password-form";

// Deliberately standalone (no AppShell/Sidebar) — reachable by every logged
// in role (admin, Mecánico, Piloto), and a Piloto should never see the
// CRM/fleet nav, same reasoning as /portal's own layout. This is mainly for
// técnicos to set their own password right after Adolfo emails them a
// temporary one (see app/personnel/actions.ts's createTechnicianAccount).
export default async function AccountPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const backHref = user.isAdmin || user.personnelRole === "Mecánico" ? "/" : "/portal";

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas-muted px-4">
      <div className="hsv-panel w-full max-w-sm">
        <div className="mb-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">HeliServiX OS</p>
          <h1 className="mt-1 text-xl font-semibold text-ink">Mi cuenta</h1>
          <p className="mt-2 text-sm text-ink-subtle">
            {user.personnelName ?? user.email}
            {user.personnelRole ? ` · ${user.personnelRole}` : ""}
          </p>
        </div>
        <ChangePasswordForm />
        <div className="mt-5 flex items-center justify-between border-t border-line pt-4">
          <Link href={backHref} className="text-xs font-semibold text-aviation-teal hover:underline">
            Volver
          </Link>
          <LogoutButton />
        </div>
      </div>
    </div>
  );
}
