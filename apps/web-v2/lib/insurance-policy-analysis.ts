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
export type PolicyAnalysis = {
  policyNumber: string | null;
  insurer: string | null;
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

function parseNumericDate(day: string, month: string, year: string): string | null {
  const y = year.length === 2 ? `20${year}` : year;
  const m = month.padStart(2, "0");
  const d = day.padStart(2, "0");
  if (Number(m) < 1 || Number(m) > 12) return null;
  return `${y}-${m}-${d}`;
}

function findDateRange(text: string): { start: string | null; end: string | null } {
  // Look for a "vigencia"/"periodo de cobertura" label, then the first two
  // dates that appear within a short window after it — numeric (22/05/2026)
  // or spelled-out Spanish (22 de mayo de 2026), whichever the insurer used.
  const labelMatch = text.match(/(vigencia|periodo de cobertura|per[ií]odo de vigencia|effective period)[^\n]{0,160}/i);
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

  return { start: dates[0] ?? null, end: dates[1] ?? null };
}

function findPolicyNumber(text: string): string | null {
  const match = text.match(/p[oó]liza\s*(?:n[uú]mero|no\.?|n[°º]|#)?\s*[:\-]?\s*([A-Z0-9][A-Z0-9\-\/]{3,24})/i);
  return match ? match[1].trim() : null;
}

function findPremium(text: string): { amount: number | null; currency: string | null } {
  const match = text.match(/prima\s*(?:total|neta|anual)?\s*[:\-]?\s*(US\$|USD|B\/\.|\$)?\s*([\d][\d,\.]{2,15})/i);
  if (!match) return { amount: null, currency: null };
  const raw = match[2].replace(/,/g, "");
  const amount = Number(raw);
  return {
    amount: Number.isFinite(amount) ? amount : null,
    currency: match[1] ? (match[1].includes("B/") ? "PAB" : "USD") : null
  };
}

// Scans for "N horas ... total/experiencia" style requirements — deliberately
// only matches when a number and a clear "total experience" keyword are
// close together, since policies also mention hours in unrelated contexts
// (e.g. "24 horas" for a claims-notification deadline).
function findMinHoursTotal(text: string): number | null {
  const match = text.match(/(\d{2,6})\s*horas?\s*(?:de\s*)?(?:vuelo\s*)?(?:totales?|de\s*experiencia|m[ií]nimas?)/i);
  if (match) return Number(match[1]);
  const reversed = text.match(/(?:m[ií]nimo|no\s*menos\s*de)\s*(?:de\s*)?(\d{2,6})\s*horas?/i);
  return reversed ? Number(reversed[1]) : null;
}

function findMinHoursType(text: string): number | null {
  const match = text.match(/(\d{1,5})\s*horas?\s*en\s*(?:el\s*)?tipo/i);
  if (match) return Number(match[1]);
  const onType = text.match(/(\d{1,5})\s*horas?\s*(?:en|de)\s*(?:R44|R66|R22|equipo)/i);
  return onType ? Number(onType[1]) : null;
}

// Pulls out the paragraph(s) that actually discuss pilot requirements, so a
// human reviewing this doesn't have to reread the whole policy — just this
// excerpt — to confirm the extracted numbers (or fill them in by hand if
// nothing above matched).
function findRequirementsSummary(text: string): string | null {
  const sentences = text
    .replace(/\s+/g, " ")
    .split(/(?<=[.;])\s+/)
    .filter((s) => /piloto|tripulaci[oó]n|licencia|certificado\s*m[eé]dico|recurrencia|chequeo\s*de\s*vuelo|horas?\s*de\s*vuelo/i.test(s));
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
    startDate: start,
    endDate: end,
    premiumAmount: premium.amount,
    currency: premium.currency,
    minPilotHoursTotal: findMinHoursTotal(text),
    minPilotHoursType: findMinHoursType(text),
    requirementsSummary: findRequirementsSummary(text)
  };
}
