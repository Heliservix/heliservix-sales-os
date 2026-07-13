"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="hidden h-10 items-center gap-2 rounded-md border border-line bg-white px-3 text-sm font-semibold text-ink-muted shadow-control transition hover:border-aviation-red/30 hover:text-aviation-red dark:bg-canvas-muted sm:flex"
      title="Cerrar sesión"
    >
      <LogOut className="h-4 w-4" aria-hidden="true" />
      Salir
    </button>
  );
}
