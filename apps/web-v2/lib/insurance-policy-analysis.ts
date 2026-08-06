// Best-effort text scanner for uploaded insurance-policy PDFs (see
// app/policies/actions.ts). Adolfo asked for this to run automatically
// rather than having him type everything in by hand — but unlike Robinson's
// service bulletins (lib/bulletin-applicability.ts), which all follow the
// same fixed layout, every insurer writes its policy documents differently.
// So this is explicitly best-effort: it extracts a field only when it finds
// an unambiguous, clearly-labeled match, and always leaves a field null
// rather than guessing. The caller (app/policies/actions.ts) always marks a
// freshly-analyzed policy's requirements_reviewed = false, so the app itself
// visibly flags "revisar" until a human confirms the numbers really match
// the document — the same conservative, human-in-the-loop pattern used for
// bulletin applicability's "Inconclusive" fallback.
//
// Tuned against 4 real Panama-issued policy/Anexo documents (Aug 2026): the
// declarations page ("Condiciones Particulares") is in Spanish and carries
// policy number / vigencia / premium totals, while the actual pilot
// experience clause lives in a SEPARATE English "Anexo" / "Particular
// Conditions Attachment" PDF (e.g. "minimum of 1,200 hours rotor wing time
// including 500 hours on make and model"). So every pattern here is checked
// in both languages, and when a document states more than one hour
// threshold (common — different minimums per flight type), the highest one
// found is kept, since the stricter figure is the operationally safe one to
// flag against for this fleet's Fish Spotting work.
//
// IMPORTANT quirk discovered while tuning this against the real PDFs: the
// Spanish declarations page is laid out as a form/table in the source PDF,
// and pdf-parse's text extraction does NOT preserve that table's visual
// reading order — labels and their values can land far apart in the
// extracted string, or even reversed (the date comes BEFORE its own
// "DESDE:"/"HASTA:" label, not after). A plain "find label, then look a
// little further in the text" regex — which works fine for normal flowing
// prose like the English Anexo — silently fails on that scrambled text.
// findDateRange() and findPolicyNumber() below each have a dedicated
// pattern for this reversed table layout in addition to the normal
// forward-label pattern used elsewhere.
export type PolicyAnalysis = {
  policyNumber: string | null;
  insurer: string | null;
  coverageType: string | null;
  startDate: string | null; // YYYY-MM-DD
  endDate: string | null; // YYYY-MM-DD
  premiumAmount: number | null;
  currency: string | null;
  minPilotHoursTotal: number | null;
  minPilotHoursType: number | null;
  requirementsSummary: string | null;
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

function parseNumericDate(day: string, month: string, year: string): string | null {
  const y = year.length === 2 ? `20${year}` : year;
  const m = month.padStart(2, "0");
  const d = day.padStart(2, "0");
  if (Number(m) < 1 || Number(m) > 12) return null;
  return `${y}-${m}-${d}`;
}

// Spanish month name -> number, tolerant of the date landing right before
// its own "DESDE:"/"HASTA:" label (see the file-level comment above) — e.g.
// "29 de ABRIL de 2026\tDESDE:".
function parseSpanishDateBeforeLabel(text: string, label: "DESDE" | "HASTA"): string | null {
  const re = new RegExp(`(\\d{1,2})\\s*(?:de)?\\s*([A-Za-zé]{3,})\\s*(?:de|del)?\\s*(\\d{4})\\s*${label}\\s*:?`, "i");
  const match = text.match(re);
  if (!match) return null;
  const month = MONTHS_ES[match[2].slice(0, 3).toLowerCase()];
  return month ? `${match[3]}-${month}-${match[1].padStart(2, "0")}` : null;
}

function findDateRange(text: string): { start: string | null; end: string | null } {
  // Priority 1: the Panama declarations-page table quirk, where the date
  // sits immediately BEFORE its own "DESDE:" (from) / "HASTA:" (to) label
  // because of how pdf-parse re-linearizes the source table.
  const desde = parseSpanishDateBeforeLabel(text, "DESDE");
  const hasta = parseSpanishDateBeforeLabel(text, "HASTA");
  if (desde && hasta) return { start: desde, end: hasta };

  // Priority 2: look for a "vigencia"/"periodo de cobertura"/"policy
  // period" label, then the first two dates that appear within a short
  // window after it — numeric (22/05/2026), spelled-out Spanish (22 de
  // mayo de 2026), or spelled-out English (29 April 2026 / April 29,
  // 2026). Works for normal flowing prose (e.g. the English Anexo), where
  // the label-then-value order isn't scrambled.
  const labelMatch = text.match(
    /(vigencia|periodo de cobertura|per[ií]odo de vigencia|effective period|policy period|period of insurance|\bperiod\s*:)[^\n]{0,160}/i
  );
  const window = labelMatch ? labelMatch[0] : text.slice(0, 800);
  const dates: string[] = [];

  const numericRegex = /\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})\b/g;
  let numericMatch: RegExpExecArray | null;
  while ((numericMatch = numericRegex.exec(window)) && dates.length < 2) {
    const parsed = parseNumericDate(numericMatch[1], numericMatch[2], numericMatch[3]);
    if (parsed) dates.push(parsed);
  }

  if (dates.length < 2) {
    const spanishRegex = /\b(\d{1,2})\s*(?:de)?\s*([A-Za-zé]{3,})[a-zé]*\s*(?:de|del)?\s*(\d{4})\b/gi;
    let spanishMatch: RegExpExecArray | null;
    while ((spanishMatch = spanishRegex.exec(window)) && dates.length < 2) {
      const month = MONTHS_ES[spanishMatch[2].slice(0, 3).toLowerCase()];
      if (month) dates.push(`${spanishMatch[3]}-${month}-${spanishMatch[1].padStart(2, "0")}`);
    }
  }

  if (dates.length < 2) {
    // English: "29 April 2026" or "April 29, 2026"
    const enDayFirst = /\b(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3,})\s+(\d{4})\b/g;
    let m: RegExpExecArray | null;
    while ((m = enDayFirst.exec(window)) && dates.length < 2) {
      const month = MONTHS_EN[m[2].slice(0, 3).toLowerCase()];
      if (month) dates.push(`${m[3]}-${month}-${m[1].padStart(2, "0")}`);
    }
  }

  if (dates.length < 2) {
    const enMonthFirst = /\b([A-Za-z]{3,})\s+(\d{1,2}),?\s+(\d{4})\b/g;
    let m: RegExpExecArray | null;
    while ((m = enMonthFirst.exec(window)) && dates.length < 2) {
      const month = MONTHS_EN[m[1].slice(0, 3).toLowerCase()];
      if (month) dates.push(`${m[3]}-${month}-${m[2].padStart(2, "0")}`);
    }
  }

  return { start: dates[0] ?? null, end: dates[1] ?? null };
}

// Collapses whatever mix of spaces/dashes the insurer (or a mis-typed
// document) used between digit groups into single dashes, so "10 02
// 0132519 1", "10 - 02 - 0132519- 1", and "10-02-132519-1" all normalize to
// the same readable "10-02-0132519-1" shape instead of losing their
// structure (an earlier version of this function just deleted whitespace,
// which turned "10 02 0132519 1" into the unreadable "100201325191").
function normalizePolicyNumber(raw: string): string {
  return raw.replace(/[\s-]+/g, "-").replace(/^-+|-+$/g, "").trim();
}

function findPolicyNumber(text: string): string | null {
  // Real numbers look like "10-02-132519-1", "10-02-69619", or get typed
  // with stray spaces around the dashes ("10 - 02 - 0132519- 1"). Digits and
  // separators only (no letters) — otherwise a greedy match runs straight
  // into the next word on the page (e.g. "VIGENCIA", "Policy Period").
  //
  // "p[oó]liza" also matches as a prefix of the Spanish plural "pólizas" —
  // deliberate, since the real declarations pages label the field "POLIZA:"
  // (singular) but other clauses in the same document say "de las pólizas
  // de seguro N°..." (plural, with unrelated words in between the label and
  // the number). Only the singular, tightly-adjacent form actually finds a
  // number reliably; the plural form is handled by the fallback below.
  const match = text.match(/p[oó]liza\s*(?:n[uú]mero|no\.?|n[°º]|#)?\s*[:\-]?\s*(\d[\d\s\-\/]{2,28}\d)/i);
  if (match) return normalizePolicyNumber(match[1]);

  const enMatch = text.match(/policy\s*(?:number|no\.?|#)?\s*[:\-]?\s*(\d[\d\s\-\/]{2,28}\d)/i);
  if (enMatch) return normalizePolicyNumber(enMatch[1]);

  // Fallback: this insurer's policy numbers all follow a "10-02-XXXXXX(-X)"
  // shape (branch code "02" in the middle) regardless of which document
  // they appear in or whether a clean "PÓLIZA:" label sits next to them —
  // e.g. "SEGURO DE CASCO AEREO 10-02-132519-1" has no such label at all.
  // A document can mention the same policy number more than once with
  // different amounts of detail (e.g. "N°10-02-132519" in one place and the
  // fuller "10-02-132519-1" elsewhere) — take the longest/most-complete
  // match found rather than just the first one. Best-effort only
  // (requirements_reviewed still starts false), but a reasonable guess is
  // more useful here than leaving this blank.
  const shapedMatches = [...text.matchAll(/\b(\d{2}[\s-]0?2[\s-]\d{4,8}(?:[\s-]\d{1,2})?)\b/g)].map((m) => normalizePolicyNumber(m[1]));
  if (!shapedMatches.length) return null;
  return shapedMatches.reduce((longest, candidate) => (candidate.length > longest.length ? candidate : longest));
}

// "USES:-" (English Anexo) is the clearest statement of what the aircraft
// is actually covered to DO (commercial, fish spotting, instruction, etc.)
// — the closest match to "tipo de operación" as Adolfo asked for it. Falls
// back to naming which of the standard Panamanian aviation coverage
// sections (Casco Aéreo / Responsabilidad Civil / Accidentes Personales /
// Gastos Médicos) are present, which is robust to the same table-reordering
// problem described above since it's just checking whether each fixed
// section title appears anywhere in the text, not where.
function findCoverageType(text: string): string | null {
  const usesMatch = text.match(/USES\s*:?-?\s*\n?([\s\S]{10,500}?)(?:\n\s*\n|PILOTS\s*:|It is a condition)/i);
  if (usesMatch) {
    const cleaned = usesMatch[1].replace(/\s+/g, " ").trim();
    if (cleaned.length > 5) return cleaned.slice(0, 400);
  }

  const sections: string[] = [];
  if (/SEGURO\s+DE\s+CASCO\s+A[EÉ]REO/i.test(text)) sections.push("Casco Aéreo");
  if (/RESPONSABILIDAD\s+CIVIL\s+A\s+TERCEROS/i.test(text)) sections.push("Responsabilidad Civil a Terceros");
  if (/ACCIDENTES\s+PERSONALES/i.test(text)) sections.push("Accidentes Personales");
  if (/GASTOS\s+M[EÉ]DICOS/i.test(text)) sections.push("Gastos Médicos");
  return sections.length ? sections.join(" + ") : null;
}

function findPremium(text: string): { amount: number | null; currency: string | null } {
  // Prefer the actual amount owed on the Panamanian declarations page
  // ("TOTAL A PAGAR"), which is the real bottom-line figure — plain "PRIMA"
  // labels there are often just one coverage-section line item, not the
  // total. Fall back to "prima total/neta" or English "total premium".
  const forwardPatterns = [
    /total\s*a\s*pagar\s*[:\-]?\s*(US\$|USD|B\/\.|\$)?\s*([\d][\d,\.]{2,15})/i,
    /prima\s*(?:total|neta|anual)?\s*[:\-]?\s*(US\$|USD|B\/\.|\$)?\s*([\d][\d,\.]{2,15})/i,
    /total\s*premium\s*(?:payable)?\s*[:\-]?\s*(US\$|USD|\$)?\s*([\d][\d,\.]{2,15})/i
  ];
  for (const pattern of forwardPatterns) {
    const match = text.match(pattern);
    if (match) {
      const raw = match[2].replace(/,/g, "");
      const amount = Number(raw);
      return {
        amount: Number.isFinite(amount) ? amount : null,
        // Panama's balboa (B/.) is pegged 1:1 with the US dollar and the
        // country doesn't print its own paper currency, so USD is the more
        // useful label for Adolfo than an unfamiliar "PAB" code.
        currency: match[1] ? "USD" : null
      };
    }
  }

  // Same reversed-table quirk as findDateRange's DESDE/HASTA handling: the
  // Panama declarations page's extracted text often has the amount land
  // BEFORE its own "TOTAL A PAGAR" label (e.g. "13,230.00\tTOTAL A PAGAR"),
  // not after it.
  const reversed = text.match(/([\d][\d,\.]{2,15})\s*TOTAL\s*A\s*PAGAR/i);
  if (reversed) {
    const amount = Number(reversed[1].replace(/,/g, ""));
    return { amount: Number.isFinite(amount) ? amount : null, currency: null };
  }

  return { amount: null, currency: null };
}

// Every "N horas/hours ..." match found near a total-experience keyword, in
// either language. Returns all candidates so the caller can pick the
// strictest (highest) one when a document lists several thresholds.
function findAllHourCandidates(text: string, patterns: RegExp[]): number[] {
  const values: number[] = [];
  for (const pattern of patterns) {
    const re = new RegExp(pattern, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`);
    let match: RegExpExecArray | null;
    while ((match = re.exec(text))) {
      const num = Number(match[1].replace(/,/g, ""));
      if (Number.isFinite(num)) values.push(num);
    }
  }
  return values;
}

// Scans for "N horas ... total/experiencia" / "minimum of N hours ... rotor
// wing" style requirements — deliberately only matches when a number and a
// clear "total experience" keyword are close together, since policies also
// mention hours in unrelated contexts (e.g. "24 horas" for a claims
// notification deadline).
function findMinHoursTotal(text: string): number | null {
  const candidates = findAllHourCandidates(text, [
    /(\d{2,6})\s*horas?\s*(?:de\s*)?(?:vuelo\s*)?(?:totales?|de\s*experiencia|m[ií]nimas?)/i,
    /(?:m[ií]nimo|no\s*menos\s*de)\s*(?:de\s*)?(\d{2,6})\s*horas?/i,
    // "minimum of 1,000 hours rotor wing time" / "1,200 hours total flight time"
    /(?:minimum\s*of\s*)?([\d,]{3,7})\s*hours?\s*(?:rotor\s*wing|total|flight)\s*(?:time|experience)?/i,
    /not\s*less\s*than\s*([\d,]{3,7})\s*hours?/i
  ]);
  return candidates.length ? Math.max(...candidates) : null;
}

function findMinHoursType(text: string): number | null {
  const candidates = findAllHourCandidates(text, [
    /(\d{1,5})\s*horas?\s*en\s*(?:el\s*)?tipo/i,
    /(\d{1,5})\s*horas?\s*(?:en|de)\s*(?:R44|R66|R22|equipo)/i,
    // "including 500 hours on make and model" / "hours on make/model"
    /(?:including\s*)?(\d{1,5})\s*hours?\s*on\s*make\s*(?:and\s*)?model/i,
    /(\d{1,5})\s*hours?\s*(?:on|in)\s*(?:type|the\s*)?(?:R44|R66|R22|aircraft\s*(?:type|model))/i
  ]);
  return candidates.length ? Math.max(...candidates) : null;
}

// Pulls out the paragraph(s) that actually discuss pilot requirements, so a
// human reviewing this doesn't have to reread the whole policy — just this
// excerpt — to confirm the extracted numbers (or fill them in by hand if
// nothing above matched). Bilingual keyword filter, since the real clause
// is usually in the English Anexo, not the Spanish declarations page.
function findRequirementsSummary(text: string): string | null {
  const sentences = text
    .replace(/\s+/g, " ")
    .split(/(?<=[.;])\s+/)
    .filter((s) =>
      /piloto|tripulaci[oó]n|licencia|certificado\s*m[eé]dico|recurrencia|chequeo\s*de\s*vuelo|horas?\s*de\s*vuelo|pilots?\b|crew\b|licen[cs]e\b|medical\s*certificate\b|hours?\s*(?:rotor|total|flight|on\s*make)/i.test(
        s
      )
    );
  if (!sentences.length) return null;
  return sentences.slice(0, 8).join(" ").trim().slice(0, 2000);
}

export function analyzePolicyText(rawText: string): PolicyAnalysis {
  const text = rawText.replace(/\r/g, "");
  const { start, end } = findDateRange(text);
  const premium = findPremium(text);

  return {
    policyNumber: findPolicyNumber(text),
    insurer: null, // Letterhead/logo text, not a consistently labeled field — left for manual entry.
    coverageType: findCoverageType(text),
    startDate: start,
    endDate: end,
    premiumAmount: premium.amount,
    currency: premium.currency,
    minPilotHoursTotal: findMinHoursTotal(text),
    minPilotHoursType: findMinHoursType(text),
    requirementsSummary: findRequirementsSummary(text)
  };
}
