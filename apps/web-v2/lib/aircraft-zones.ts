// Best-effort classifier that maps a bulletin's title/subject to a rough
// physical zone on the aircraft, purely so /compliance/bulletins can show
// "roughly where on the helicopter this is" next to each row via
// components/aircraft/helicopter-zone-diagram.tsx. Same philosophy as
// lib/bulletin-applicability.ts: deterministic keyword matching over the
// bulletin's own text, not a guess dressed up as certainty — anything that
// doesn't match a known pattern falls through to "other" (shown as a plain
// silhouette, no zone highlighted) rather than picking a zone at random.
//
// This is NOT a substitute for reading the actual maintenance manual
// section a bulletin points to — it's an at-a-glance orientation aid for a
// técnico scanning a list of bulletins, nothing more.
export type AircraftZone = "main_rotor" | "tail_rotor" | "flight_controls" | "landing_gear" | "fuel" | "engine" | "cabin" | "other";

export const ZONE_LABEL: Record<AircraftZone, string> = {
  main_rotor: "Rotor principal",
  tail_rotor: "Rotor de cola",
  flight_controls: "Controles de vuelo / servos",
  landing_gear: "Tren de aterrizaje / estructura",
  fuel: "Sistema de combustible",
  engine: "Motor",
  cabin: "Cabina / equipo",
  other: "General / sin zona específica"
};

const ZONE_PATTERNS: [AircraftZone, RegExp][] = [
  ["main_rotor", /main rotor|rotor blade|teeter hinge|coning hinge|pitch link|leading edge/i],
  ["tail_rotor", /tail\s*rotor|tailrotor/i],
  ["flight_controls", /swashplate|servo|push-pull|flight control|throttle link|belt-tension|belt tension actuator/i],
  ["landing_gear", /frame tube|skid|ground handling wheel|landing gear/i],
  ["fuel", /fuel|avgas|fuel control/i],
  ["engine", /magneto|tachometer|engine|muffler|tailpipe|carburet/i],
  ["cabin", /seat belt|cabin|fire extinguisher|elt\b|emergency locator|altimeter/i]
];

export function classifyBulletinZone(title: string, applicability?: string | null): AircraftZone {
  const text = `${title} ${applicability ?? ""}`;
  for (const [zone, pattern] of ZONE_PATTERNS) {
    if (pattern.test(text)) return zone;
  }
  return "other";
}
