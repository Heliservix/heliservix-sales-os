import { redirect } from "next/navigation";
import Link from "next/link";
import { HardHat, UserCircle } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { LogoutButton } from "@/components/layout/logout-button";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();

  // Middleware already guarantees a logged-in session reaches here — this
  // is just a defensive second check.
  if (!user) redirect("/login");

  const linked = user.isAdmin || Boolean(user.personnelId);

  return (
    <div className="min-h-screen bg-canvas-muted">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-white px-4 py-3 shadow-sm sm:px-6">
        <div className="flex items-center gap-2">
          <HardHat className="h-5 w-5 text-aviation-teal" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-ink">Portal Técnico</p>
            <p className="text-xs text-ink-subtle">
              {user.personnelName ?? user.email}
              {user.personnelRole ? ` · ${user.personnelRole}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/account"
            className="flex h-10 items-center gap-2 rounded-md border border-line bg-white px-3 text-sm font-semibold text-ink-muted shadow-control transition hover:border-aviation-blue/30 hover:text-aviation-blue"
            title="Mi cuenta"
          >
            <UserCircle className="h-4 w-4" aria-hidden="true" />
          </Link>
          <LogoutButton />
        </div>
      </header>

      <main className="mx-auto max-w-xl px-4 py-8 sm:px-6">
        {linked ? (
          children
        ) : (
          <div className="hsv-panel text-center">
            <p className="text-lg font-semibold text-ink">Tu cuenta todavía no está vinculada</p>
            <p className="mt-2 text-sm text-ink-subtle">
              Iniciaste sesión correctamente ({user.email}), pero tu correo no coincide con ningún piloto o mecánico
              registrado en el sistema. Pide a Adolfo que agregue tu correo en el módulo Personal para poder continuar.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
