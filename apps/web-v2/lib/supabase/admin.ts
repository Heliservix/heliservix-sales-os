import { createClient } from "@supabase/supabase-js";

// Server-only client using the Supabase service_role key — the only client
// in this codebase allowed to create/manage Auth users directly (admin.*
// methods). Never import this from a Client Component or anything that
// could ship it to the browser; it is only ever used from Server Actions
// (files starting with "use server", like app/personnel/actions.ts).
//
// SUPABASE_SERVICE_ROLE_KEY is deliberately NOT in .env.example with a
// placeholder — Adolfo needs to copy it himself from the Supabase
// dashboard (Project Settings → API → service_role secret) into Vercel's
// environment variables and his own .env.local. It must never be
// NEXT_PUBLIC_-prefixed.
export function createSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Falta SUPABASE_SERVICE_ROLE_KEY. Copia la 'service_role secret key' desde Supabase (Project Settings → API) y agrégala como variable de entorno en Vercel y en tu .env.local."
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}
