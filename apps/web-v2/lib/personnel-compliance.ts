// Shared "is this document expired/expiring" logic for pilot & mechanic
// paperwork (license, medical certificate, recurrency, flight check,
// passport) — used by the Personal list/edit pages and by the Alertas page
// (see app/alerts/page.tsx), so both read the exact same rule for what
// counts as "por vencer" instead of drifting apart. Mirrors the
// days/tone thresholds already used for insurance policy vigencia/payments
// in app/policies/page.tsx (< 0 = vencido/red, <= 60 días = amber).
export type DocumentTone = "green" | "amber" | "red";

export type PersonnelDocumentRow = {
  id: string;
  full_name: string;
  role: string;
  license_expiry: string | null;
  medical_certificate_expiry: string | null;
  recurrency_expiry: string | null;
  flight_check_expiry: string | null;
  passport_expiry: string | null;
};

export type DocumentStatus = {
  key: string;
  label: string;
  expiry: string;
  daysUntil: number;
  tone: DocumentTone;
};

export function daysUntil(date: string): number {
  const diff = new Date(`${date}T00:00:00Z`).getTime() - new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z").getTime();
  return Math.round(diff / 86400000);
}

export function documentTone(days: number): DocumentTone {
  if (days < 0) return "red";
  if (days <= 60) return "amber";
  return "green";
}

// Only returns an entry for documents that actually have an expiry date on
// file — a person with nothing filled in yet (common right after this
// feature ships) shows no warnings rather than a false "vencido."
export function getPersonnelDocumentStatuses(person: PersonnelDocumentRow): DocumentStatus[] {
  const checks: { key: string; label: string; expiry: string | null }[] = [
    { key: "license", label: "Licencia", expiry: person.license_expiry },
    { key: "medical", label: "Certificado médico", expiry: person.medical_certificate_expiry },
    { key: "recurrency", label: "Recurrencia", expiry: person.recurrency_expiry },
    { key: "flightCheck", label: "Chequeo de vuelo", expiry: person.flight_check_expiry },
    { key: "passport", label: "Pasaporte", expiry: person.passport_expiry }
  ];

  return checks
    .filter((c): c is { key: string; label: string; expiry: string } => c.expiry != null)
    .map((c) => {
      const days = daysUntil(c.expiry);
      return { key: c.key, label: c.label, expiry: c.expiry, daysUntil: days, tone: documentTone(days) };
    });
}
