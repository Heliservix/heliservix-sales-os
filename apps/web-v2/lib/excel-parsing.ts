// Shared helpers for parsing the mechanics' Excel workbooks (Control Maestro,
// weekly operations reports). Values in these files show up inconsistently —
// real Date objects in some cells, "DD-MMM-YYYY" text in others, Excel serial
// numbers, or numbers formatted as text — so every importer needs the same
// tolerant parsing.

export function normalize(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

export function cellText(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  return String(value ?? "").trim();
}

const MONTHS: Record<string, number> = {
  ene: 0, jan: 0,
  feb: 1,
  mar: 2,
  abr: 3, apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  ago: 7, aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dic: 11, dec: 11
};

function excelSerialToDate(serial: number): Date {
  // Excel's day-0 is 1899-12-30 in the 1900 date system.
  return new Date(Math.round((serial - 25569) * 86400 * 1000));
}

/** Returns an ISO "YYYY-MM-DD" string, or null if the value isn't a parseable date. */
export function parseFlexibleDate(value: unknown): string | null {
  if (value == null || value === "") return null;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === "number") {
    const date = excelSerialToDate(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
  }

  const text = String(value).trim();
  if (!text) return null;

  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  // DD-MMM-YYYY, e.g. "10-MAR-2026" (English or Spanish month abbreviations)
  const monthMatch = text.match(/^(\d{1,2})[-\s]([A-Za-z]{3,})[-\s](\d{4})$/);
  if (monthMatch) {
    const day = Number.parseInt(monthMatch[1], 10);
    const monthKey = normalize(monthMatch[2]).slice(0, 3);
    const month = MONTHS[monthKey];
    const year = Number.parseInt(monthMatch[3], 10);
    if (month !== undefined && day >= 1 && day <= 31) {
      const date = new Date(Date.UTC(year, month, day));
      return date.toISOString().slice(0, 10);
    }
  }

  // DD/MM/YYYY
  const slash = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slash) {
    const date = new Date(Date.UTC(Number(slash[3]), Number(slash[2]) - 1, Number(slash[1])));
    if (!Number.isNaN(date.getTime())) return date.toISOString().slice(0, 10);
  }

  return null;
}

/** Parses a number, stripping units/text like "1820.4 HRS" or "1,916.5". Returns 0 for unparseable values. */
export function parseNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (value instanceof Date) return 0;
  const cleaned = String(value ?? "").replace(/[^0-9.\-]/g, "");
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Same as parseNumber but returns null instead of 0 when the cell is empty/unparseable — use this
 * when "no value" and "zero" need to stay distinguishable (e.g. hour readouts). */
export function parseNumberOrNull(value: unknown): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number") return value;
  const cleaned = String(value).replace(/[^0-9.\-]/g, "");
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Finds the first row (0-indexed) within `rows` whose cells contain any of `aliases`. */
export function findHeaderRowIndex(rows: unknown[][], aliases: string[], fromRow = 0): number {
  for (let r = fromRow; r < rows.length; r++) {
    const row = rows[r] ?? [];
    for (const cell of row) {
      const norm = normalize(cell);
      if (norm && aliases.some((alias) => norm.includes(alias))) return r;
    }
  }
  return -1;
}

/** Finds a row (0-indexed) whose *first* cell matches one of `aliases`. */
export function findRowIndexByFirstCell(rows: unknown[][], aliases: string[], fromRow = 0): number {
  for (let r = fromRow; r < rows.length; r++) {
    const norm = normalize(rows[r]?.[0]);
    if (norm && aliases.some((alias) => norm.includes(alias))) return r;
  }
  return -1;
}

/** Finds a label anywhere in the given row range and returns the cell right after it. */
export function findLabelValue(rows: unknown[][], aliases: string[], fromRow = 0, toRow = rows.length): unknown {
  for (let r = fromRow; r < Math.min(toRow, rows.length); r++) {
    const row = rows[r] ?? [];
    for (let c = 0; c < row.length; c++) {
      const norm = normalize(row[c]);
      if (norm && aliases.some((alias) => norm.includes(alias))) return row[c + 1] ?? null;
    }
  }
  return null;
}

export function buildColumnIndex(headerRow: unknown[]): Map<string, number> {
  const map = new Map<string, number>();
  (headerRow ?? []).forEach((cell, index) => {
    const norm = normalize(cell);
    if (norm) map.set(norm, index);
  });
  return map;
}

export function findColumn(index: Map<string, number>, aliases: string[]): number {
  for (const [header, colIndex] of index) {
    if (aliases.some((alias) => header.includes(alias))) return colIndex;
  }
  return -1;
}
