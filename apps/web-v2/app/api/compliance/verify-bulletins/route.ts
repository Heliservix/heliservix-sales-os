import { NextResponse } from "next/server";
import { runBulletinVerification } from "@/lib/bulletin-verification";

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
