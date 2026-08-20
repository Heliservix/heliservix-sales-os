// Reads structured fields out of a photo of an ID-style document (Seaman
// Book / Libreta de Marino, to start) using free, local OCR (tesseract.js —
// no API key, no per-document cost, runs inside the same server action).
// Adolfo asked for this Aug 2026: "al subirte el archivo o foto del ID se
// suban los datos automáticamente ... número de pasaporte, fecha de
// emisión y vencimiento". He was first offered a paid Claude-vision route
// for better accuracy, but Anthropic's console requires loading paid API
// credit before issuing a key — he chose to skip that and use this free
// route instead, which trades some accuracy on blurry/old photos for zero
// cost and zero new accounts.
//
// Same conservative philosophy as the rest of this codebase even though the
// mechanism is different: only fill a field when a clearly-labeled match is
// found near it, otherwise leave it null rather than guessing — a human
// (Adolfo, in the personnel edit form) always sees what was read and can
// correct it before saving. OCR text from a real phone photo is noisier
// than the clean PDF text lib/insurance-policy-analysis.ts works with, so
// this is tuned to be conservative about what counts as a "clear match" —
// better to leave a field blank for him to type than to grab the wrong
// number.
//
// tesseract.js needs internet access the first time it runs in a given
// server instance (to download the English trained-data file, a few MB) —
// fine on Vercel (normal outbound internet), just means the very first
// Seaman Book photo after a deploy/cold-start can take a few extra seconds.
import { createWorker } from "tesseract.js";

export type SeamanBookExtraction = {
  documentNumber: string | null;
  issueDate: string | null; // YYYY-MM-DD
  expiryDate: string | null; // YYYY-MM-DD
  fullNameOnDocument: string | null; // shown to Adolfo so he can sanity-check this is the right person's document
  notes: string | null; // anything worth flagging to the human reviewer
};

function emptyResult(notes: string | null = null): SeamanBookExtraction {
  return { documentNumber: null, issueDate: null, expiryDate: null, fullNameOnDocument: null, notes };
}

const MONTHS_EN: Record<string, string> = {
  jan: "01",
  feb: "02",
  mar: "03",
  apr: "04",
  may: "05",
  jun: "06",
  jul: "07",
  aug: "08",
  sep: "09",
  oct: "10",
  nov: "11",
  dec: "12"
};

const MONTHS_ES: Record<string, string> = {
  ene: "01",
  feb: "02",
  mar: "03",
  abr: "04",
  may: "05",
  jun: "06",
  jul: "07",
  ago: "08",
  sep: "09",
  oct: "10",
  nov: "11",
  dic: "12"
};

// Every date format actually seen on real seaman books/passports: numeric
// (DD/MM/YYYY or DD-MM-YYYY — day-first, the convention nearly everywhere
// outside the US) and spelled-out month (both languages, "12 MAR 2024" /
// "12 MARZO 2024" style, common on stamped/printed document fields).
function findDateNear(text: string, labelPattern: RegExp): string | null {
  const labelMatch = text.match(labelPattern);
  if (!labelMatch || labelMatch.index == null) return null;
  // Bounded to the label's own line (plus a little slack for a wrapped
  // value) — a raw character-count window would happily read into the
  // FOLLOWING line's date on a short label (e.g. "Issued:" followed
  // immediately by a newline then the next field), grabbing the wrong one.
  const afterLabel = text.slice(labelMatch.index + labelMatch[0].length);
  const endOfLine = afterLabel.search(/\r?\n/);
  const window = endOfLine === -1 ? afterLabel.slice(0, 60) : afterLabel.slice(0, Math.max(endOfLine, 40));

  const numeric = window.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
  if (numeric) {
    const day = numeric[1].padStart(2, "0");
    const month = numeric[2].padStart(2, "0");
    const year = numeric[3].length === 2 ? `20${numeric[3]}` : numeric[3];
    if (Number(month) >= 1 && Number(month) <= 12) return `${year}-${month}-${day}`;
  }

  const spelled = window.match(/(\d{1,2})\s*([A-Za-zé]{3,})\s*(\d{4})/);
  if (spelled) {
    const key = spelled[2].slice(0, 3).toLowerCase();
    const month = MONTHS_EN[key] ?? MONTHS_ES[key];
    if (month) return `${spelled[3]}-${month}-${spelled[1].padStart(2, "0")}`;
  }

  return null;
}

// Document number: an alphanumeric code (letters+digits, 5-15 chars) right
// after a clear "No." / "Book No" / "N°" style label — deliberately does
// NOT try to grab any long number in the text, since a photo of a booklet
// page is full of unrelated numbers (page numbers, MRZ-like rows, dates).
function findDocumentNumber(text: string): string | null {
  const patterns = [
    /seaman'?s?\s*(?:book|identity)?\s*(?:no\.?|number|n[°º])\s*[:\-]?\s*([A-Z0-9][A-Z0-9\-]{4,17})/i,
    /(?:book|document|libreta)\s*(?:no\.?|number|n[°º])\s*[:\-]?\s*([A-Z0-9][A-Z0-9\-]{4,17})/i,
    // Spanish documents often reverse the order — "N° Libreta:" (the "N°"
    // symbol first, then the word) rather than "Libreta N°".
    /n[°º]\s*(?:de\s*)?(?:libreta|book|documento)\s*[:\-]?\s*([A-Z0-9][A-Z0-9\-]{4,17})/i,
    /\bno\.?\s*[:\-]\s*([A-Z0-9][A-Z0-9\-]{4,17})\b/i
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1].toUpperCase();
  }
  return null;
}

function findName(text: string): string | null {
  // Only matches within a single OCR'd line (horizontal whitespace only,
  // via [^\S\r\n]) — a plain \s would happily cross the newline into the
  // NEXT labeled field ("Name: JUAN PEREZ\nBook No: ..." was matching all
  // the way into "Book No" before this fix) since both a name and the next
  // label start with a capital letter.
  const match = text.match(/(?:full[^\S\r\n]*name|name|nombre)[^\S\r\n]*[:\-]?[^\S\r\n]*([A-ZÁÉÍÓÚÑ][^\r\n]{1,60}?)(?=\r?\n|$)/i);
  return match ? match[1].trim() : null;
}

export async function extractSeamanBookFields(imageBytes: Uint8Array, _mimeType: string): Promise<SeamanBookExtraction> {
  let worker: Awaited<ReturnType<typeof createWorker>> | null = null;
  try {
    worker = await createWorker("eng");
    const { data } = await worker.recognize(Buffer.from(imageBytes));
    const rawText = data.text ?? "";
    const confidence = data.confidence ?? 0;

    if (!rawText.trim()) {
      return emptyResult("No se detectó texto legible en la foto — súbela más nítida o llena los datos a mano.");
    }

    const documentNumber = findDocumentNumber(rawText);
    const issueDate = findDateNear(rawText, /date\s*of\s*issue|issued|fecha\s*de\s*emisi[oó]n|fecha\s*de\s*expedici[oó]n/i);
    const expiryDate = findDateNear(rawText, /date\s*of\s*expir|valid\s*until|expiry|fecha\s*de\s*vencimiento|v[aá]lido\s*hasta/i);
    const fullNameOnDocument = findName(rawText);

    const notesParts: string[] = [];
    if (confidence < 60) {
      notesParts.push(`Confianza de lectura baja (${Math.round(confidence)}%) — revisa los datos contra la foto original.`);
    }
    if (!documentNumber && !issueDate && !expiryDate) {
      notesParts.push("No se pudo identificar con certeza el número ni las fechas — probablemente hay que llenarlos a mano.");
    }

    return {
      documentNumber,
      issueDate,
      expiryDate,
      fullNameOnDocument,
      notes: notesParts.length ? notesParts.join(" ") : null
    };
  } catch (err) {
    return emptyResult(`No se pudo leer la foto automáticamente: ${(err as Error).message}`);
  } finally {
    if (worker) await worker.terminate();
  }
}
