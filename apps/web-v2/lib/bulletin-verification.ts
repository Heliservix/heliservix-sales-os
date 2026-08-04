// Orchestrates the full "Verificar boletines" job that /compliance/bulletins'
// button (and the twice-a-month scheduled task) triggers:
//
//   1. Pull any brand-new Robinson SB/SL published since the last run
//      (lib/robinson-sync.ts — same step the older "Buscar boletines nuevos"
//      button already did on its own).
//   2. For every Robinson bulletin still sitting at "Not reviewed" with a PDF
//      on file, fetch the PDF's real text and run it through
//      lib/bulletin-applicability.ts against the CURRENT fleet (registration,
//      model, serial number) read fresh from Supabase every time — so a
//      newly-added aircraft is automatically covered on the next run.
//   3. Write back a definite "Applicable"/"Not applicable" call plus a plain
//      -language explanation, or leave the item at "Not reviewed" with a note
//      explaining why a human still needs to look at it (some bulletins only
//      apply if a specific piece of optional equipment is installed, which
//      this system doesn't track per aircraft).
//
// Deliberately conservative about what it overwrites: only rows still at
// "Not reviewed" are touched. Once a status is set (by this job or by a
// person), later runs leave it alone — this is a triage tool for the
// backlog of unread bulletins, not a system that silently re-litigates
// decisions someone already made (e.g. marking one "Complied" after doing
// the actual maintenance).
import { PDFParse } from "pdf-parse";
import { supabase } from "@/lib/supabase";
import { analyzeBulletinText, type FleetAircraft } from "@/lib/bulletin-applicability";
import { syncNewRobinsonBulletins, type RobinsonSyncResult } from "@/lib/robinson-sync";

export type BulletinVerificationItemResult = {
  referenceNumber: string | null;
  title: string;
  verdict: "Applicable" | "Not applicable" | "Inconclusive" | "Error";
  detail: string;
};

export type BulletinVerificationSummary = {
  sync: RobinsonSyncResult;
  processed: number;
  applicable: number;
  notApplicable: number;
  inconclusive: number;
  errors: number;
  items: BulletinVerificationItemResult[];
};

async function fetchPdfText(url: string): Promise<string> {
  const parser = new PDFParse({ url });
  try {
    const result = await parser.getText();
    return result.text ?? "";
  } finally {
    await parser.destroy();
  }
}

export async function runBulletinVerification(): Promise<BulletinVerificationSummary> {
  const sync = await syncNewRobinsonBulletins();

  const [{ data: helicopters }, { data: pendingItems }] = await Promise.all([
    supabase.from("helicopters").select("registration, model, serial_number").eq("archived", false),
    supabase
      .from("compliance_items")
      .select("id, reference_number, title, attachment_placeholder, due_date")
      .eq("authority", "Robinson")
      .eq("archived", false)
      .eq("status", "Not reviewed")
      .not("attachment_placeholder", "is", null)
  ]);

  const fleet: FleetAircraft[] = (helicopters ?? []).map((h) => ({
    registration: h.registration,
    model: h.model,
    serialNumber: h.serial_number
  }));

  const items: BulletinVerificationItemResult[] = [];
  let applicable = 0;
  let notApplicable = 0;
  let inconclusive = 0;
  let errors = 0;

  for (const item of (pendingItems ?? []) as { id: string; reference_number: string | null; title: string; attachment_placeholder: string; due_date: string | null }[]) {
    try {
      const text = await fetchPdfText(item.attachment_placeholder);
      if (!text.trim()) {
        throw new Error("El PDF no tiene texto legible (posible escaneo de imagen).");
      }
      const analysis = analyzeBulletinText(text, fleet);
      const now = new Date().toISOString();

      if (analysis.verdict === "Inconclusive") {
        await supabase
          .from("compliance_items")
          .update({ applicability: analysis.reason, last_verified_at: now })
          .eq("id", item.id);
        inconclusive += 1;
      } else {
        await supabase
          .from("compliance_items")
          .update({
            status: analysis.verdict,
            applicability: analysis.reason,
            due_date: analysis.dueDate ?? item.due_date,
            last_verified_at: now
          })
          .eq("id", item.id);
        if (analysis.verdict === "Applicable") applicable += 1;
        else notApplicable += 1;
      }

      items.push({ referenceNumber: item.reference_number, title: item.title, verdict: analysis.verdict, detail: analysis.reason });
    } catch (err) {
      errors += 1;
      items.push({
        referenceNumber: item.reference_number,
        title: item.title,
        verdict: "Error",
        detail: `No se pudo verificar automáticamente: ${(err as Error).message}`
      });
      // Still stamp last_verified_at so the UI shows this was attempted, not
      // silently skipped — the applicability field is left untouched since
      // we have nothing better to say than "verification failed."
      await supabase
        .from("compliance_items")
        .update({ last_verified_at: new Date().toISOString() })
        .eq("id", item.id);
    }
  }

  return {
    sync,
    processed: items.length,
    applicable,
    notApplicable,
    inconclusive,
    errors,
    items
  };
}
