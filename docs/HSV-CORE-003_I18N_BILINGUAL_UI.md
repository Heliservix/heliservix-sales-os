# HSV-CORE-003 — Bilingual UI and Internationalization

## Core Status

Product: HeliServiX OS

Core capability: Bilingual interface architecture

Status: HSV OS 0.4 frontend foundation. Backend, database, authentication, and external translation services are not included in this scope.

## Language Policy

HeliServiX OS must be bilingual from HSV OS 0.4 forward.

- Default language: English.
- Supported language: Spanish.
- Language choice must persist locally in the frontend until user accounts and profiles exist.
- Future backend user profiles should store language preference per user and tenant.

## Translation Scope

The i18n system applies to:

- Sidebar navigation.
- Top navigation.
- Dashboard labels.
- Page headers.
- Table headers.
- Form labels.
- Common actions.
- Status labels.
- Empty states.
- Demo data notices.
- System-generated messages.

The i18n system must not translate user-entered data such as campaign names, vessel names, notes, document titles, supplier names, aircraft registrations, component serial numbers, or manually entered descriptions.

## Naming Standard

The user-facing module formerly shown as Digital Twin must be named:

- English: Aircraft Operations Center.
- Spanish: Centro de Operaciones de la Aeronave.

The internal technical concept may still be called helicopter digital twin or digital twin in architecture, rules, and developer-facing documentation when discussing computed aircraft state. User-facing navigation, page titles, labels, and help text must use Aircraft Operations Center.

## Aviation Terminology

Required terminology:

- Registration: Matrícula.
- Aircraft: Aeronave.
- Helicopter: Helicóptero.
- Current Hourmeter: Horómetro Actual.
- Hobbs: Horómetro (Hobbs).
- Component: Componente.
- Part Number: P/N.
- Serial Number: S/N.
- TSN: TSN.
- TSO: TSO.
- Life Limit: Límite de Vida.
- Remaining Hours: Horas Remanentes.
- Calendar Limit: Límite Calendario.
- Maintenance Alert: Alerta de Mantenimiento.
- Forecast: Pronóstico.
- Overhaul: Overhaul.
- Service Bulletin (SB): Boletín de Servicio (SB).
- Airworthiness Directive (AD): Directiva de Aeronavegabilidad (AD).
- Logbook: Logbook.
- Release to Service: Liberación al Servicio.
- Technical Records: Registros Técnicos.
- Compliance: Cumplimiento.
- Vessel: Barco.
- Campaign: Campaña.
- Inventory: Inventario.
- Purchasing: Compras.

## Translation Governance

- All future UI text must use the i18n system instead of hardcoded user-facing text.
- New modules must add English and Spanish translations before release.
- Technical aviation terms must be reviewed for consistency before merging.
- Status labels must be translated centrally.
- User-entered data must remain in the language entered by the user.
- AI-generated or imported text must be marked as content, not interface text, unless explicitly translated through a reviewed workflow.

## Implementation Rules

- The current frontend uses lightweight dictionaries for English and Spanish.
- English remains the fallback language.
- Missing translation keys should fail gracefully by returning the original English phrase.
- The language switcher must update visible labels immediately.
- Selected language is persisted in `localStorage`.
- Future backend implementation should move preferences to authenticated user profiles.

## Acceptance Criteria

- Users can switch between English and Spanish from the top navigation.
- The selected language persists after refresh.
- Sidebar, dashboard, page headers, table headers, form labels, statuses, actions, demo notices, and Aircraft Operations Center pages use translated labels.
- The application does not translate user-entered records.
- User-facing text uses Aircraft Operations Center / Centro de Operaciones de la Aeronave instead of Digital Twin.
