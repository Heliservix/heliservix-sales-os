import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabase } from "@/lib/supabase";

// Comma-separated list of emails treated as full administrators (Adolfo,
// and anyone else who should see the whole system, not just the technician
// portal). Configured per-deployment in .env.local — see .env.example.
function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export type SessionUser = {
  email: string;
  isAdmin: boolean;
  personnelId: string | null;
  personnelName: string | null;
  personnelRole: "Piloto" | "Mecánico" | null;
};

// The single place that answers "who is logged in, and are they an admin
// or a técnico?" — used by middleware.ts (route gating) and by the /portal
// pages (to know which faenas belong to this person). A técnico is matched
// to their `personnel` row by email, which Adolfo fills in once per person
// in the Personal module (see app/personnel).
export async function getSessionUser(): Promise<SessionUser | null> {
  const client = await createSupabaseServerClient();
  const {
    data: { user }
  } = await client.auth.getUser();

  if (!user?.email) return null;

  const email = user.email.toLowerCase();
  const isAdmin = adminEmails().includes(email);

  if (isAdmin) {
    return { email, isAdmin: true, personnelId: null, personnelName: null, personnelRole: null };
  }

  const { data: person } = await supabase
    .from("personnel")
    .select("id, full_name, role")
    .ilike("email", email)
    .eq("status", "Active")
    .eq("archived", false)
    .maybeSingle();

  return {
    email,
    isAdmin: false,
    personnelId: person?.id ?? null,
    personnelName: person?.full_name ?? null,
    personnelRole: (person?.role as "Piloto" | "Mecánico" | undefined) ?? null
  };
}
