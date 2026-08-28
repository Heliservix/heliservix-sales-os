// Single source of truth for what a Mecánico can reach — used by both
// middleware.ts (server-side route gating, the actual security boundary)
// and the Sidebar/TopNav (client-side nav filtering, so a técnico doesn't
// even see links to pages they'd get bounced from). Keeping these two in
// one place means they can never drift apart.
//
// Dashboard ("/") + Flota (full access, per Adolfo's explicit request) +
// the whole Mantenimiento module: Alertas, Registros Técnicos, Cumplimiento
// (incl. Boletines, which lives under /compliance/bulletins), Órdenes de
// Trabajo, No Rutina, Biblioteca Técnica Robinson (external reference links
// only — no dollar values) — plus AURA's advice (no dollar values live
// there, confirmed before adding it — only maintenance/operations
// recommendations). Everything else (Personal, Pólizas, Compras, Inventario,
// Vessels, Campañas, Reports, Portal Técnico's weekly-report wizard) is
// admin-only.
export const MECHANIC_ALLOWED_PREFIXES = [
  "/helicopters",
  "/alerts",
  "/technical-records",
  "/compliance",
  "/work-orders",
  "/non-routine",
  "/aura",
  "/library",
  "/account"
];

export function isMechanicAllowedPath(pathname: string): boolean {
  if (pathname === "/") return true;
  return MECHANIC_ALLOWED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
