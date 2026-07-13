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

## Brand Text Standard

The product name is HeliServiX OS in every language and must not be translated.

The product subtitle must be translated as:

- English: Helicopter Operations System.
- Spanish: Sistema de Operaciones de Helicópteros.

The HeliServiX OS lockup uses the official HeliServiX logo plus the OS product extension. The i18n system translates the subtitle and surrounding interface text, but it must not translate or alter the official logo, product name, aircraft registrations, vessel names, document names, notes, or other user-entered data.

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
- Product branding must follow `HSV-BRAND-001_BRAND_SYSTEM.md`, including the rule that the official HeliServiX logo is not modified.

## AI Assistant Language Rules

The AI Assistant MVP must support bilingual report drafting in English and Spanish.

- Fleet status reports, maintenance reports, component due reports, vessel inventory reports, and management summaries must be draftable in either English or Spanish.
- HeliServiX OS must not be translated.
- Aviation terms must follow the governed terminology list in this document.
- User-entered data such as aircraft registrations, component names, part numbers, serial numbers, vessel names, notes, document numbers, and source-record identifiers must remain unchanged.
- AI-generated reports must be marked as AI-drafted content and reviewed before operational use.

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
- Brand subtitles and dashboard welcome messages appear in English and Spanish while preserving the HeliServiX OS product name.
