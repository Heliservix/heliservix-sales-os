import { NextResponse } from "next/server";
import { syncNewRobinsonBulletins } from "@/lib/robinson-sync";

// See the same note in /api/compliance/verify-bulletins/route.ts: Vercel
// Hobby's default 5s timeout isn't reliably enough time to fetch and parse
// robinsonheli.com/publications.
export const maxDuration = 30;

// Manual (and, if a cron ever calls this URL, automatic) sync: fetches
// Robinson's publications page, finds R44 SB/SL entries not already in
// compliance_items, and inserts the new ones as "Not reviewed". The actual
// fetch/parse/insert logic lives in lib/robinson-sync.ts so it can be shared
// with the fuller bulletin-verification job (see
// /api/compliance/verify-bulletins), which runs this same sync step before
// re-checking applicability against the fleet.
export async function GET() {
  const result = await syncNewRobinsonBulletins();
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }
  return NextResponse.json({ checked: result.checked, added: result.added, newItems: result.newItems, warning: result.warning });
}
