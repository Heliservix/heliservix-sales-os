# HSV-BRAND-001 — HeliServiX OS Brand System

## Core Status

Product: HeliServiX OS

Brand capability: Official product identity and UI brand governance

Status: Active from HSV OS 0.4 onward. The frontend uses the official HeliServiX corporate logo with an OS product extension. This document governs all future product UI, documentation, and interface branding.

## Product Name

The product name is HeliServiX OS.

The product name must not be translated. English, Spanish, and future language interfaces must retain HeliServiX OS exactly.

## Subtitle

The product subtitle is:

- English: Helicopter Operations System.
- Spanish: Sistema de Operaciones de Helicópteros.

The subtitle may appear in the sidebar header, dashboard header, login experience, loading states, printed exports, and executive-facing product references. It should not replace the product name.

## Logo Usage

The official HeliServiX corporate logo is the primary logo asset.

Rules:

- Do not modify the official HeliServiX logo.
- Do not redraw the wordmark.
- Do not recolor the logo.
- Do not crop the logo.
- Do not distort the logo or alter its proportions.
- Do not place effects, gradients, outlines, or filters directly on the logo.
- Use the original transparent logo file where possible.
- Preserve adequate clear space around the logo in the UI.

## OS Lockup Rule

The HeliServiX OS lockup is formed by the official HeliServiX logo plus a separate OS product extension.

The OS extension may be rendered as text beside the official logo, but it must remain visually subordinate to the official HeliServiX mark. The OS extension should use HeliServiX OS interface typography, not a modified version of the corporate logo.

The lockup may include the subtitle below or beside the logo depending on available space:

- Full lockup: official HeliServiX logo + OS extension + subtitle.
- Compact lockup: official HeliServiX logo + OS extension.
- Icon or favicon placeholder: official logo asset or approved derivative generated from the official logo without redesigning the mark.

## Color Palette

Primary colors:

- Primary Blue: `#005BAA`.
- Dark Navy: `#061B2E`.
- Light Blue: `#E8F3FF`.
- White: `#FFFFFF`.
- Light Gray: `#F3F6FA`.

Operational status colors:

- Status Green: `#16A34A` for healthy, ready, complete, or compliant states.
- Status Yellow: `#D97706` for monitor, warning, approaching due, or pending review states.
- Status Red: `#DC2626` for critical, expired, overdue, blocked, or unsafe states.

Color rules:

- The sidebar and major navigation surfaces should use Dark Navy.
- Active navigation and primary actions should use Primary Blue.
- Light Blue should support highlights, selected states, and aircraft operations callouts.
- White and Light Gray should dominate page backgrounds, cards, tables, and forms.
- Green, yellow, and red must be reserved for operational status. They should not be used as decorative brand colors.
- Future modules must avoid arbitrary accent colors unless a domain-specific status meaning is documented.

## Typography Recommendation

The interface should use a modern sans-serif type system with strong legibility at operational dashboard sizes. Headings should be clear and confident, not decorative. Body copy should remain readable in dense tables, cards, and forms.

Typography principles:

- Use larger, readable headings for page and dashboard hierarchy.
- Use compact but legible labels for table headers and field names.
- Avoid negative letter spacing.
- Avoid oversized marketing typography inside operational workspaces.
- Keep aviation terms consistent across English and Spanish.

## UI Spacing Principles

HeliServiX OS is an enterprise aviation operations system. The interface should feel premium, calm, and precise.

Spacing rules:

- Use consistent page padding across desktop and mobile.
- Keep cards rounded but restrained.
- Prefer clean white panels with soft shadows over decorative containers.
- Preserve enough spacing around operational metrics so they can be scanned quickly.
- Avoid nested cards unless the inner card represents a repeated record, modal, or framed tool.
- Dense operational tables may use tighter row spacing than dashboard cards, but must remain readable.

## Status Color Rules

Operational status colors must communicate real meaning:

- Green means safe, ready, compliant, complete, or within normal limits.
- Yellow means monitor, pending, approaching a limit, or requiring review.
- Red means critical, expired, overdue, unsafe, blocked, or non-compliant.

Status labels must be translated through the i18n system. User-entered status-like notes are content and must not be automatically translated.

## Bilingual Brand Rules

Brand text follows the bilingual UI standard:

- Product name: HeliServiX OS in every language.
- English subtitle: Helicopter Operations System.
- Spanish subtitle: Sistema de Operaciones de Helicópteros.
- Interface labels and system messages use the i18n system.
- User-entered data is not translated.

## Governance

All future HeliServiX OS UI must follow this brand system.

Design and development changes that introduce new primary colors, logo treatments, product names, or subtitles must update this document and the bilingual terminology documentation before release.

The official HeliServiX logo remains the primary corporate mark. HeliServiX OS is a product extension, not a redesign of the company identity.
