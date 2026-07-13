import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PUBLIC_PATHS = ["/login", "/favicon.png", "/_next"];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

// Gates EVERY page in the app behind a real Supabase Auth session. Before
// this, the whole system was reachable by anyone with the URL (matches the
// old "Authentication is not active" MVP posture). This is the login wall
// Adolfo asked for so técnicos can have their own accounts.
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

  // Técnicos (anyone not in ADMIN_EMAILS) are confined to the /portal
  // wizard — they should never land on the CRM/fleet/pricing screens.
  const email = user.email?.toLowerCase() ?? "";
  const admins = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  const isAdmin = admins.includes(email);

  if (!isAdmin && !pathname.startsWith("/portal")) {
    return NextResponse.redirect(new URL("/portal", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.png).*)"]
};
