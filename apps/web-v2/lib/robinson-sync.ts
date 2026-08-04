// Shared "pull new bulletins from robinsonheli.com" step — originally lived
// only inside app/api/compliance/sync-robinson/route.ts, extracted here so
// the automated bulletin-verification job (lib/bulletin-verification.ts) can
// run the same sync before it re-checks applicability, without duplicating
// the fetch/parse/insert logic in two places.
import { supabase } from "@/lib/supabase";
import { parseRobinsonBulletins } from "@/lib/robinson-bulletins";

const ROBINSON_PUBLICATIONS_URL = "https://www.robinsonheli.com/publications";

export type RobinsonSyncResult =
  | { ok: true; checked: number; added: number; newItems: { referenceNumber: string; title: string }[]; warning?: string }
  | { ok: false; error: string };

export async function syncNewRobinsonBulletins(): Promise<RobinsonSyncResult> {
  let html: string;
  try {
    const response = await fetch(ROBINSON_PUBLICATIONS_URL, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; HeliServiXComplianceSync/1.0)" },
      cache: "no-store"
    });
    if (!response.ok) {
      return { ok: false, error: `robinsonheli.com respondió ${response.status}.` };
    }
    html = await response.text();
  } catch (err) {
    return { ok: false, error: `No se pudo conectar a robinsonheli.com: ${(err as Error).message}` };
  }

  const parsed = parseRobinsonBulletins(html);
  if (!parsed.length) {
    return {
      ok: true,
      checked: 0,
      added: 0,
      newItems: [],
      warning:
        "No se encontró ningún boletín R44 en la página de Robinson. Puede que hayan cambiado el formato de la página — conviene revisar robinsonheli.com/publications manualmente."
    };
  }

  const { data: existing, error: fetchError } = await supabase
    .from("compliance_items")
    .select("reference_number")
    .eq("authority", "Robinson")
    .eq("archived", false);

  if (fetchError) {
    return { ok: false, error: `No se pudo consultar los ítems existentes: ${fetchError.message}` };
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
        notes:
          "Agregado automáticamente desde robinsonheli.com/publications. Revisar el PDF completo para confirmar si aplica a una aeronave específica y su ventana de cumplimiento.",
        attachment_placeholder: item.attachmentUrl,
        // The "source" column only allows 'Demo' | 'User' at the database
        // level (infra/database/schema.sql) — there's no 'System' value, so
        // auto-synced rows are still recorded as 'User'. Provenance is kept
        // in the notes field instead ("Agregado automáticamente...").
        source: "User"
      }))
    );
    if (insertError) {
      return { ok: false, error: `Se encontraron ${newItems.length} boletín(es) nuevo(s) pero no se pudieron guardar: ${insertError.message}` };
    }
  }

  return {
    ok: true,
    checked: parsed.length,
    added: newItems.length,
    newItems: newItems.map((item) => ({ referenceNumber: item.referenceNumber, title: item.title }))
  };
}
