import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isMechanicAllowedPath } from "@/lib/role-access";

// The two Robinson-bulletin automation endpoints are exempted from the login
// wall on purpose: they're triggered two ways — a click from an already-
// logged-in admin's browser, and the twice-a-month scheduled task, which
// calls the URL directly with no browser session/cookies at all. Before this
// exemption, that second path could never work (it would always get
// redirected to an HTML /login page instead of the JSON response the route
// returns), and even the button was hitting the same failure the moment the
// session cookie didn't round-trip cleanly through a same-origin fetch(). The
// exposure this accepts is minimal: both endpoints only read public Robinson
// bulletin PDFs and this fleet's own registrations/models/serial numbers, and
// only ever WRITE a compliance-item status/applicability note — no sensitive
// data is returned, and nothing destructive can happen even if someone
// outside the company found the URL.
const PUBLIC_PATHS = [
  "/login",
  "/favicon.png",
  "/_next",
  "/api/compliance/sync-robinson",
  "/api/compliance/verify-bulletins"
];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

// Plain REST fetch instead of importing lib/supabase.ts's @supabase/supabase-js
// client here — middleware runs on a restricted runtime and a raw fetch
// against PostgREST avoids any bundling risk from that heavier client. Only
// ever looks up the ROLE for routing decisions, never anything sensitive.
async function getPersonnelRole(email: string): Promise<string | null> {
  const url =
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/personnel` +
    `?select=role&email=ilike.${encodeURIComponent(email)}&status=eq.Active&archived=eq.false&limit=1`;

  try {
    const res = await fetch(url, {
      headers: {
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
      }
    });
    if (!res.ok) return null;
    const rows = (await res.json()) as Array<{ role: string }>;
    return rows[0]?.role ?? null;
  } catch {
    return null;
  }
}

// Gates EVERY page in the app behind a real Supabase Auth session, then
// routes by role: admins see everything; a Mecánico gets the Dashboard,
// Flota, and the whole Mantenimiento module (see lib/role-access.ts for the
// exact allow-list); a Piloto (or anyone whose email doesn't match an
// active personnel row) is confined to the /portal weekly-report wizard,
// same as before this Mecánico role existed.
//
// Deliberately app-layer only for now: the database's RLS policies still
// grant `anon, authenticated` (see infra/database/schema.sql), so this does
// not yet stop someone from calling the Supabase API directly if they had
// the project URL and anon key. Tightening RLS to `authenticated`-only is a
// bigger, separate change (it requires every existing page/action to read
// the visitor's session instead of the current no-session singleton
// client) — flagged as a deliberate next step, not done silently here, so
// nothing that already works today breaks in the same change.
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
        }
      }
    }
  );

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const email = user.email?.toLowerCase() ?? "";
  const admins = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  const isAdmin = admins.includes(email);

  if (isAdmin) return response;

  if (pathname.startsWith("/account")) return response;

  const role = await getPersonnelRole(email);

  // Administrativo (Aug 2026, Adolfo: quiere poder dar acceso total al
  // sistema sin depender de que yo edite ADMIN_EMAILS en Vercel cada vez) —
  // full access, exactly like an ADMIN_EMAILS admin. Managed entirely from
  // Personal: role="Administrativo" + "Crear acceso". Mirrored in
  // lib/auth.ts's getSessionUser, which is what the rest of the app reads.
  if (role === "Administrativo") return response;

  // Mecánico: Dashboard + Fleet + full Mantenimiento module, nothing else.
  if (role === "Mecánico") {
    if (!isMechanicAllowedPath(pathname)) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return response;
  }

  // Piloto (or an email that doesn't match any active personnel row yet) —
  // confined to the /portal weekly-report wizard, same as before. /portal's
  // own layout shows a friendly "tu cuenta no está vinculada" message when
  // there's no matching personnel row at all.
  if (!pathname.startsWith("/portal")) {
    return NextResponse.redirect(new URL("/portal", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.png).*)"]
};
