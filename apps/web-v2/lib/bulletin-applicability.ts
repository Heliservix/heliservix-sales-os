// Best-effort text analysis that reads a Robinson SB/SL's plain-text body
// (already extracted from the PDF) and decides whether it applies to a given
// fleet, by comparing the model + serial-number range stated in the bulletin
// against each aircraft's registration/model/serial number.
//
// This is deliberately conservative, same philosophy as
// lib/robinson-bulletins.ts's HTML scraper: real aviation bulletins use
// inconsistent phrasing across 20+ years of documents (see the test fixtures
// in bulletin-applicability.test-fixtures.ts, all real R44 SB/SL text pulled
// directly from robinsonheli.com), so this only ever returns "Applicable" or
// "Not applicable" when it found an unambiguous model/serial-number match. If
// it can't confidently parse the applicability section (e.g. the bulletin's
// scope depends on optional equipment like a radar altimeter or a specific
// ELT model, which this system doesn't track per aircraft), it returns
// "Inconclusive" and leaves the compliance item exactly as it was ("Not
// reviewed") rather than guessing. A human confirms those.
export type FleetAircraft = {
  registration: string;
  model: string;
  serialNumber: string | null;
};

export type BulletinVerdict = "Applicable" | "Not applicable" | "Inconclusive";

export type BulletinAnalysis = {
  verdict: BulletinVerdict;
  matchedRegistrations: string[];
  unmatchedRegistrations: string[];
  sparesOnly: boolean;
  dueDate: string | null;
  reason: string;
};

const MONTHS: Record<string, string> = {
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

function parseDate(text: string): string | null {
  const match = text.match(/\b(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})\b/);
  if (!match) return null;
  const month = MONTHS[match[2].slice(0, 3).toLowerCase()];
  if (!month) return null;
  return `${match[3]}-${month}-${match[1].padStart(2, "0")}`;
}

/** Pulls a hard calendar deadline out of a "TIME OF COMPLIANCE" clause, e.g.
 * "...or by 31 December 2023" / "by 1 November 2006, whichever occurs
 * first." Returns null when compliance is only tied to a flight-hour
 * inspection cycle ("at next 100-hour or annual inspection") — there's no
 * fixed date to extract in that case. */
function extractDueDate(normalizedText: string): string | null {
  const complianceSection = normalizedText.match(/TIME OF COMPLIANCE:([\s\S]{0,200})/i);
  const scope = complianceSection ? complianceSection[1] : normalizedText.slice(0, 400);
  const match = scope.match(/by\s+(\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4})/i);
  return match ? parseDate(match[1]) : null;
}

/** Unifies the several ways these bulletins (and one badly-OCR'd scan) spell
 * "serial number(s)" so downstream regexes only need to look for "SN". */
function normalize(text: string): string {
  return text
    .replace(/S\s*\/\s*N['’]?s?\b/gi, "SN")
    .replace(/\bSIN['’]?s?\b(?=\s*\d)/gi, "SN")
    .replace(/Serial\s+Numbers?/gi, "SN")
    .replace(/\s+/g, " ");
}

// Every real Robinson bulletin PDF prints a bare "R44" (or "R22"/"R44
// SERVICE BULLETIN SB-nn"/etc.) as page furniture at the very top, entirely
// unrelated to who the bulletin actually applies to — a naive scan of the
// first few hundred characters would treat that boilerplate as "mentions
// plain R44" even on an R44-II-only bulletin. To avoid that false positive,
// model-scope checks only look inside the labeled fields that actually state
// applicability (TO:, ROTORCRAFT AFFECTED:, AFFECTED AIRCRAFT:, PARTS
// AFFECTED:, EFFECTIVITY:) rather than a raw character slice.
const ALL_LABELS = [
  "ROTORCRAFT AFFECTED",
  "AFFECTED AIRCRAFT",
  "PARTS AFFECTED",
  "EFFECTIVITY",
  "TO",
  "SUBJECT",
  "DATE",
  "BACKGROUND",
  "TIME OF COMPLIANCE",
  "COMPLIANCE PROCEDURE",
  "APPROXIMATE COST"
];
const SCOPE_LABELS = new Set(["ROTORCRAFT AFFECTED", "AFFECTED AIRCRAFT", "PARTS AFFECTED", "EFFECTIVITY", "TO"]);

function extractScopeText(text: string): string {
  const labelRegex = new RegExp(`\\b(${ALL_LABELS.join("|")})\\s*:`, "gi");
  const hits: { label: string; start: number; contentStart: number }[] = [];
  let hit: RegExpExecArray | null;
  while ((hit = labelRegex.exec(text))) {
    hits.push({ label: hit[1].toUpperCase(), start: hit.index, contentStart: hit.index + hit[0].length });
  }
  const chunks: string[] = [];
  for (let i = 0; i < hits.length; i++) {
    if (!SCOPE_LABELS.has(hits[i].label)) continue;
    const end = i + 1 < hits.length ? hits[i + 1].start : Math.min(text.length, hits[i].contentStart + 500);
    chunks.push(text.slice(hits[i].contentStart, end));
  }
  return chunks.join(" ");
}

const OTHER_MODEL_TAGS = ["R44 II", "R44 Cadet", "R22", "R66"];

/** True when the text names plain R44 as a distinct, standalone product line
 * (not just as a substring of "R44 II"/"R44 Cadet"), or uses the umbrella
 * term "R44-series" which always includes plain R44. */
function mentionsPlainR44(text: string): boolean {
  return /\bR44-series\b/i.test(text) || /\bR44\b(?!\s*(?:II|Cadet))/i.test(text);
}

function mentionsOtherModelOnly(text: string): string | null {
  if (mentionsPlainR44(text)) return null;
  for (const tag of OTHER_MODEL_TAGS) {
    if (new RegExp(tag.replace(/\s+/g, "\\s*"), "i").test(text)) return tag;
  }
  return null;
}

type RangeClause = { from: number; to: number };

/** Extracts every "R44 Helicopter(s) SN X thru Y" / "SN X & prior" / "R44s
 * thru SN X" style clause that names plain R44 (not R44 II/Cadet/R66/R22),
 * across the several real phrasings seen in Robinson's actual bulletins. A
 * serial matches the bulletin if it falls inside ANY returned clause. */
function extractPlainR44Ranges(normalizedText: string): RangeClause[] {
  const ranges: RangeClause[] = [];

  // "R44 Helicopter SN 0001 thru 2767" / "R44 Helicopters SN 1361 thru 2354"
  const thruPattern = /\bR44\b(?!\s*(?:II|Cadet))\s+Helicopters?\s+SN\s+(\d+)\s+thru\s+(\d+)/gi;
  let match: RegExpExecArray | null;
  while ((match = thruPattern.exec(normalizedText))) {
    ranges.push({ from: Number(match[1]), to: Number(match[2]) });
  }

  // "R44 Helicopter SN 2819 & prior" / "SN 2819 and prior"
  const priorPattern = /\bR44\b(?!\s*(?:II|Cadet))\s+Helicopters?\s+SN\s+(\d+)\s*(?:&|and)\s*prior/gi;
  while ((match = priorPattern.exec(normalizedText))) {
    ranges.push({ from: 1, to: Number(match[1]) });
  }

  // "R44s thru SN 1576" (SB-56 style — "originally installed in R44s thru SN 1576")
  const pluralThruPattern = /\bR44s\s+thru\s+SN\s+(\d+)/gi;
  while ((match = pluralThruPattern.exec(normalizedText))) {
    ranges.push({ from: 1, to: Number(match[1]) });
  }

  return ranges;
}

/** "except SN(s) 1161, 1165, and 1198" — serials otherwise inside a matched
 * range that are explicitly carved out. */
function extractExceptions(normalizedText: string): number[] {
  const match = normalizedText.match(/except\s+SNs?\s+([\d,\s]*?and\s*\d+|\d+(?:,\s*\d+)*)/i);
  if (!match) return [];
  return Array.from(match[1].matchAll(/\d+/g)).map((m) => Number(m[0]));
}

const SPARES_ONLY_PATTERN =
  /shipped as spares|new-undrilled|in-service .{0,20}(?:bolts?|parts?|palnuts?) .{0,20}(?:is|are) unaffected|not yet installed|uninstalled palnuts/i;

// Restricting the "conditional on optional equipment" search to the first
// ~700 characters (the TO:/ROTORCRAFT AFFECTED:/SUBJECT: header) avoids false
// positives from unrelated "equipped with"/"installed" phrases deeper in a
// compliance procedure's body text.
const OPTIONAL_EQUIPMENT_PATTERN = /equipped with [^.]{3,90}|with [^.]{3,70}\binstalled\b/i;

export function analyzeBulletinText(rawText: string, fleet: FleetAircraft[]): BulletinAnalysis {
  const text = normalize(rawText);
  const dueDate = extractDueDate(text);

  if (SPARES_ONLY_PATTERN.test(text)) {
    return {
      verdict: "Applicable",
      matchedRegistrations: [],
      unmatchedRegistrations: fleet.map((f) => f.registration),
      sparesOnly: true,
      dueDate,
      reason:
        "Este boletín solo afecta piezas nuevas / repuestos sin instalar, no componentes ya instalados en ninguna aeronave. Revisar el inventario de repuestos por los part numbers indicados en el boletín."
    };
  }

  // Model restriction is checked before equipment-conditionality: if the
  // bulletin only applies to a model variant our fleet doesn't have at all
  // (R44 II, Cadet, R22, R66), that alone settles it — it doesn't matter
  // that it's ALSO conditional on some optional equipment, since no aircraft
  // of that variant exists to check.
  const scope = extractScopeText(text);
  const otherModelOnly = mentionsOtherModelOnly(scope);
  if (otherModelOnly) {
    return {
      verdict: "Not applicable",
      matchedRegistrations: [],
      unmatchedRegistrations: fleet.map((f) => f.registration),
      sparesOnly: false,
      dueDate,
      reason: `Este boletín aplica solo a ${otherModelOnly}. La flota registrada no tiene ninguna aeronave de esa variante.`
    };
  }

  const optionalEquipmentMatch = scope.match(OPTIONAL_EQUIPMENT_PATTERN);
  if (optionalEquipmentMatch) {
    return {
      verdict: "Inconclusive",
      matchedRegistrations: [],
      unmatchedRegistrations: fleet.map((f) => f.registration),
      sparesOnly: false,
      dueDate,
      reason: `Depende de un equipo opcional que el sistema no registra por aeronave ("${optionalEquipmentMatch[0].trim()}"). Confirmar físicamente cuál helicóptero tiene ese equipo antes de marcar como aplicable o no.`
    };
  }

  const ranges = extractPlainR44Ranges(text);
  const exceptions = extractExceptions(text);
  const r44Fleet = fleet.filter((f) => /\bR44\b/i.test(f.model) && !/\bII\b|Cadet/i.test(f.model));

  if (ranges.length) {
    const matched: string[] = [];
    const unmatched: string[] = [];
    for (const aircraft of r44Fleet) {
      const sn = aircraft.serialNumber != null ? Number(aircraft.serialNumber) : NaN;
      const inRange = Number.isFinite(sn) && ranges.some((r) => sn >= r.from && sn <= r.to) && !exceptions.includes(sn);
      (inRange ? matched : unmatched).push(aircraft.registration);
    }
    const rangeDescription = ranges.map((r) => `SN ${r.from}-${r.to}`).join(", ");
    return {
      verdict: matched.length ? "Applicable" : "Not applicable",
      matchedRegistrations: matched,
      unmatchedRegistrations: unmatched,
      sparesOnly: false,
      dueDate,
      reason: matched.length
        ? `Aplica a ${matched.join(", ")} (rango del boletín: ${rangeDescription}${exceptions.length ? `, excepto SN ${exceptions.join(", ")}` : ""}).${unmatched.length ? ` No aplica a ${unmatched.join(", ")} (fuera de rango).` : ""}`
        : `Ninguna aeronave de la flota está dentro del rango indicado (${rangeDescription}${exceptions.length ? `, excepto SN ${exceptions.join(", ")}` : ""}).`
    };
  }

  if (mentionsPlainR44(scope)) {
    return {
      verdict: "Applicable",
      matchedRegistrations: r44Fleet.map((f) => f.registration),
      unmatchedRegistrations: [],
      sparesOnly: false,
      dueDate,
      reason: "Aplica a toda la flota R44 — el boletín no indica una restricción de número de serie."
    };
  }

  return {
    verdict: "Inconclusive",
    matchedRegistrations: [],
    unmatchedRegistrations: fleet.map((f) => f.registration),
    sparesOnly: false,
    dueDate,
    reason: "No se pudo determinar automáticamente el rango de aplicabilidad de este boletín — revisar el PDF manualmente."
  };
}
