import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Copy .env.example to .env.local and fill in your Supabase project values."
  );
}

// Single shared client. There is no login yet (matches the documented
// HSV OS 0.2/0.3 "Authentication is not active" limitation), so this
// uses the anon key everywhere — server and client — and relies on the
// RLS policies in infra/database/schema.sql (`anon, authenticated`).
// Once Supabase Auth is added, server code should switch to a
// per-request client built from the user's session instead of this
// module-level singleton.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false }
});
