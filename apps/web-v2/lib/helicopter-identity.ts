// A purely VISUAL way to tell aircraft apart at a glance across the system
// (Flota, Boletines, the maintenance report) — a stable color per
// registration, deterministically derived so it never needs to be manually
// assigned or stored. Deliberately a different palette than the
// green/amber/red used everywhere else for OK/Monitor/Critical health
// signals (tailwind.config.ts's status/aviation colors) — an aircraft's
// identity color must never be mistaken for a health warning.
export type HelicopterColor = { name: string; hex: string };

const IDENTITY_PALETTE: HelicopterColor[] = [
  { name: "índigo", hex: "#4F46E5" },
  { name: "esmeralda", hex: "#0D9488" },
  { name: "ámbar oscuro", hex: "#B45309" },
  { name: "fucsia", hex: "#BE185D" },
  { name: "azul cielo", hex: "#0284C7" },
  { name: "violeta", hex: "#7C3AED" },
  { name: "naranja quemado", hex: "#C2410C" },
  { name: "verde oliva", hex: "#4D7C0F" }
];

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/** Same registration always maps to the same color, with no database column
 * or manual assignment needed — the color is a pure function of the tail
 * number's text. */
export function helicopterColor(registration: string): HelicopterColor {
  const index = hashString(registration.trim().toUpperCase()) % IDENTITY_PALETTE.length;
  return IDENTITY_PALETTE[index];
}

/** Short label used inside a badge when there's no photo — the last 4
 * characters of the registration (e.g. "HP1768" -> "1768"), which is
 * usually enough to distinguish this fleet's tail numbers at a glance. */
export function helicopterInitials(registration: string): string {
  const clean = registration.trim().toUpperCase();
  return clean.slice(-4) || clean;
}
