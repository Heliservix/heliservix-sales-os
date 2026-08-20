// Reads structured fields out of a photo of an ID-style document (Seaman
// Book / Libreta de Marino, to start) using Claude's vision, since — unlike
// the insurance policy PDFs (lib/insurance-policy-analysis.ts) — these
// arrive as photos of a physical booklet page, not machine-readable text a
// regex can scan. Adolfo asked for this Aug 2026: "al subirte el archivo o
// foto del ID se suban los datos automáticamente ... número de pasaporte,
// fecha de emisión y vencimiento", and chose the paid vision-API route over
// a free local-OCR route for better accuracy on real, sometimes-imperfect
// phone photos of an aging booklet.
//
// Same conservative philosophy as the rest of this codebase even though the
// mechanism is different: ask for ONLY the fields on the document, return
// null (never guess) for anything not clearly legible, and the caller
// (app/personnel/actions.ts) always lets a human see what was read and
// correct it in the edit form before it's final — this never silently
// overwrites a field a person already filled in by hand with a worse guess.
//
// Requires ANTHROPIC_API_KEY to be set (Vercel env vars + local .env.local).
// If it's missing, callers get a clear "no configurada" error instead of a
// cryptic SDK crash — the photo itself still uploads and saves fine either
// way; only the auto-fill step is skipped.
import Anthropic from "@anthropic-ai/sdk";

export type SeamanBookExtraction = {
  documentNumber: string | null;
  issueDate: string | null; // YYYY-MM-DD
  expiryDate: string | null; // YYYY-MM-DD
  fullNameOnDocument: string | null; // shown to Adolfo so he can sanity-check this is the right person's document
  notes: string | null; // anything Claude flagged as unclear/illegible
};

function emptyResult(): SeamanBookExtraction {
  return { documentNumber: null, issueDate: null, expiryDate: null, fullNameOnDocument: null, notes: null };
}

// Claude sometimes wraps JSON in a sentence or a ```json fence despite being
// asked not to — pull out the first {...} block rather than trusting
// response.text to be pure JSON.
function extractJsonBlock(text: string): unknown {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

function asDateOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : null;
}

function asTextOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export async function extractSeamanBookFields(imageBytes: Uint8Array, mimeType: string): Promise<SeamanBookExtraction> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { ...emptyResult(), notes: "ANTHROPIC_API_KEY no está configurada — la foto se guardó, pero no se pudo leer automáticamente." };
  }

  const supportedMime = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
  const mediaType = supportedMime.has(mimeType) ? mimeType : "image/jpeg";

  const client = new Anthropic({ apiKey });
  const base64 = Buffer.from(imageBytes).toString("base64");

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType as "image/jpeg" | "image/png" | "image/gif" | "image/webp", data: base64 }
            },
            {
              type: "text",
              text:
                "Esta es una foto de un Seaman Book (Libreta de Marino / pasaporte de marino). " +
                "Responde SOLO con un objeto JSON (sin texto adicional, sin markdown) con estas claves exactas: " +
                '{"documentNumber": string|null, "issueDate": string|null, "expiryDate": string|null, "fullNameOnDocument": string|null, "notes": string|null}. ' +
                "Las fechas van en formato YYYY-MM-DD. Si un dato no se puede leer con certeza en la imagen, pon null en ese campo " +
                "en vez de adivinar — es preferible dejarlo vacío a inventar un valor. Usa \"notes\" solo para avisar de algo " +
                "importante que no encaje en los otros campos (ej. \"la foto está borrosa\", \"parece vencido\")."
            }
          ]
        }
      ]
    });

    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") return { ...emptyResult(), notes: "Claude no devolvió texto legible." };

    const parsed = extractJsonBlock(textBlock.text);
    if (!parsed || typeof parsed !== "object") {
      return { ...emptyResult(), notes: "No se pudo interpretar la respuesta del análisis." };
    }
    const record = parsed as Record<string, unknown>;
    return {
      documentNumber: asTextOrNull(record.documentNumber),
      issueDate: asDateOrNull(record.issueDate),
      expiryDate: asDateOrNull(record.expiryDate),
      fullNameOnDocument: asTextOrNull(record.fullNameOnDocument),
      notes: asTextOrNull(record.notes)
    };
  } catch (err) {
    return { ...emptyResult(), notes: `No se pudo leer la foto automáticamente: ${(err as Error).message}` };
  }
}
