import { NextResponse } from "next/server";
import { runBulletinVerification } from "@/lib/bulletin-verification";

// Vercel's default function timeout is only 5s on the Hobby plan — nowhere
// near enough for "fetch robinsonheli.com + fetch and parse several PDFs."
// 60s is the Hobby plan's own maximum; the job itself is built to run well
// under that (parallel PDF fetches, each capped at 15s — see
// lib/bulletin-verification.ts), this is just headroom.
export const maxDuration = 60;

// Full "check current bulletins against the fleet" job: syncs any new
// Robinson SB/SL first, then re-checks every still-unreviewed bulletin's PDF
// against the current fleet's registrations/models/serial numbers. Triggered
// by the "Verificar boletines" button on /compliance/bulletins, and by the
// twice-a-month scheduled task set up alongside it.
export async function GET() {
  try {
    const summary = await runBulletinVerification();
    return NextResponse.json(summary);
  } catch (err) {
    return NextResponse.json({ error: `No se pudo completar la verificación: ${(err as Error).message}` }, { status: 500 });
  }
}
