import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Copy .env.example to .env.local and fill in your Supabase project values."
  );
}

// This client is ONLY for auth-aware code paths (login, middleware, /portal,
// and the "who is logged in right now" check). It reads the visitor's own
// session from cookies, still using the anon key (never the service_role
// key — see lib/supabase.ts for why). It is intentionally separate from the
// module-level `supabase` singleton used by the rest of the app: that one
// has no session and keeps working exactly as before against the existing
// `anon, authenticated` RLS policies. Only auth/portal code needs to know
// who is actually logged in.
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl!, supabaseAnonKey!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component with no response to write to —
          // safe to ignore because middleware.ts refreshes the session on
          // every request anyway.
        }
      }
    }
  });
}
