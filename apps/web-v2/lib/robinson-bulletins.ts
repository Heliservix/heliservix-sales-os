// Best-effort scraper for https://www.robinsonheli.com/publications.
//
// The page lists each R44 Service Bulletin / Service Letter as, in document
// order: a link whose text is the reference number (e.g. "R44 SB-119A"),
// optionally a "Supersedes" / "Superseded by" note with the old reference,
// then a one-line title, then a date like "22 May 2026". This was verified
// against the real page on 10 Jul 2026 (see seed_robinson_compliance.sql —
// the 6 rows there match exactly what this parser would have produced).
//
// This is regex/text pattern matching against raw HTML, not a real DOM
// parser — deliberately conservative. If Robinson changes the page layout
// enough to break the pattern, this should return few/no results rather than
// guess wrong. Callers must treat "0 results" as "verify manually," not
// "confirmed nothing new."
export type ParsedRobinsonBulletin = {
  referenceNumber: string; // e.g. "R44 SB-119A"
  complianceType: "SB" | "Service Letter";
  title: string;
  effectiveDate: string | null; // YYYY-MM-DD
  attachmentUrl: string;
  supersedes: string | null;
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
  const match = text.match(/\b(\d{1,2})\s+([A-Za-z]{3})[a-z]*\s+(\d{4})\b/);
  if (!match) return null;
  const month = MONTHS[match[2].slice(0, 3).toLowerCase()];
  if (!month) return null;
  return `${match[3]}-${month}-${match[1].padStart(2, "0")}`;
}

function stripTags(html: string): string {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(td|tr|th|div|p|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&mdash;|&#8212;/gi, "—")
    .replace(/&ndash;|&#8211;/gi, "–")
    .replace(/&#8217;|&rsquo;/gi, "'")
    .replace(/&#\d+;/g, " ")
    .replace(/&[a-z]+;/gi, " ");
}

/** Extracts R44 Service Bulletins and Service Letters from the raw HTML of
 * robinsonheli.com/publications. */
export function parseRobinsonBulletins(html: string): ParsedRobinsonBulletin[] {
  const results: ParsedRobinsonBulletin[] = [];
  const anchorPattern = /<a[^>]+href="([^"]+\.pdf)"[^>]*>\s*R44\s+(SB|SL)-(\d+[A-Z]?)\s*<\/a>/gi;

  let match: RegExpExecArray | null;
  while ((match = anchorPattern.exec(html))) {
    const [fullMatch, url, kind, number] = match;
    const referenceNumber = `R44 ${kind.toUpperCase()}-${number}`;

    const windowStart = match.index + fullMatch.length;
    const rawWindow = html.slice(windowStart, windowStart + 1200);
    const nextAnchorIdx = rawWindow.search(/<a[^>]+href="[^"]+\.pdf"/i);
    const trimmedWindow = nextAnchorIdx > -1 ? rawWindow.slice(0, nextAnchorIdx) : rawWindow;

    const lines = stripTags(trimmedWindow)
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    let effectiveDate: string | null = null;
    let supersedes: string | null = null;
    const titleLines: string[] = [];

    for (const line of lines) {
      if (!effectiveDate) {
        const date = parseDate(line);
        if (date) {
          effectiveDate = date;
          continue;
        }
      }
      if (/^supersed/i.test(line)) continue;
      if (/^ref\./i.test(line)) continue;
      if (/^R44\s+(SB|SL)-\d+[A-Z]?$/i.test(line)) {
        supersedes = line;
        continue;
      }
      if (!effectiveDate) titleLines.push(line);
    }

    results.push({
      referenceNumber,
      complianceType: kind.toUpperCase() === "SB" ? "SB" : "Service Letter",
      title: titleLines.join(" ").replace(/\s+/g, " ").trim() || referenceNumber,
      effectiveDate,
      attachmentUrl: url,
      supersedes
    });
  }

  return results;
}
