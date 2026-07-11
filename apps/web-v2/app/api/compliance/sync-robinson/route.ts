import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { parseRobinsonBulletins } from "@/lib/robinson-bulletins";

const ROBINSON_PUBLICATIONS_URL = "https://www.robinsonheli.com/publications";

// Manual (and, if a cron ever calls this URL, automatic) sync: fetches
// Robinson's publications page, finds R44 SB/SL entries not already in
// compliance_items (matched by reference_number, scoped to authority =
// Robinson so a manually-entered item with the same free-text reference
// never gets clobbered), and inserts the new ones as "Not reviewed" — same
// shape as seed_robinson_compliance.sql, but with source: "System" so it's
// distinguishable from hand-entered rows. Never sets due_date/due_hours or
// related_helicopter: those require a human to read the actual PDF and match
// it against a specific aircraft's serial number.
export async function GET() {
  let html: string;
  try {
    const response = await fetch(ROBINSON_PUBLICATIONS_URL, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; HeliServiXComplianceSync/1.0)" },
      cache: "no-store"
    });
    if (!response.ok) {
      return NextResponse.json({ error: `robinsonheli.com respondió ${response.status}.` }, { status: 502 });
    }
    html = await response.text();
  } catch (err) {
    return NextResponse.json({ error: `No se pudo conectar a robinsonheli.com: ${(err as Error).message}` }, { status: 502 });
  }

  const parsed = parseRobinsonBulletins(html);
  if (!parsed.length) {
    return NextResponse.json({
      checked: 0,
      added: 0,
      newItems: [],
      warning:
        "No se encontró ningún boletín R44 en la página de Robinson. Puede que hayan cambiado el formato de la página — conviene revisar robinsonheli.com/publications manualmente."
    });
  }

  const { data: existing, error: fetchError } = await supabase
    .from("compliance_items")
    .select("reference_number")
    .eq("authority", "Robinson")
    .eq("archived", false);

  if (fetchError) {
    return NextResponse.json({ error: `No se pudo consultar los ítems existentes: ${fetchError.message}` }, { status: 500 });
  }

  const knownReferences = new Set((existing ?? []).map((row) => (row.reference_number ?? "").trim().toUpperCase()));
  const newItems = parsed.filter((item) => !knownReferences.has(item.referenceNumber.toUpperCase()));

  if (newItems.length) {
    const { error: insertError } = await supabase.from("compliance_items").insert(
      newItems.map((item) => ({
        authority: "Robinson",
        compliance_type: item.complianceType,
        reference_number: item.referenceNumber,
        title: item.title,
        effective_date: item.effectiveDate,
        applicability: item.supersedes
          ? `Reemplaza ${item.supersedes}. Verificar aplicabilidad por S/N contra el PDF oficial.`
          : "Verificar aplicabilidad por S/N contra el PDF oficial.",
        status: "Not reviewed",
        notes: "Agregado automáticamente desde robinsonheli.com/publications. Revisar el PDF completo para confirmar si aplica a una aeronave específica y su ventana de cumplimiento.",
        attachment_placeholder: item.attachmentUrl,
        source: "System"
      }))
    );
    if (insertError) {
      return NextResponse.json(
        { error: `Se encontraron ${newItems.length} boletín(es) nuevo(s) pero no se pudieron guardar: ${insertError.message}` },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({
    checked: parsed.length,
    added: newItems.length,
    newItems: newItems.map((item) => ({ referenceNumber: item.referenceNumber, title: item.title }))
  });
}
