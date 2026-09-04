// Payroll calculator for pilots/mechanics assigned to a faena, matching the
// office's own working spreadsheet ("estatus 2026.xlsx" — FAENAS 2026 CARONI)
// and the real Pacific Helicopter Supplies contracts (pilot: $4,500/mo +
// $10/ton; mechanic: $3,500/mo + $6/ton — verified against Doman León and
// Ricardo Solís/Melvi García's contracts). Both the contract text and the
// spreadsheet's own arithmetic agree on the same two-part structure:
//
//   1. Monthly salary is prorated by DAYS WORKED over a standard 30-day
//      month ("PAGO X DIA LAB" in the sheet) and paid in full up front —
//      it is NOT part of the 80/20 split.
//   2. The per-ton bonus (personnel.rate_per_ton × tons) IS split: 80% is
//      advanced once the dock/estimated weight is known, and the remaining
//      balance is settled once the processing plant's final weigh-in comes
//      back (contract clause CUARTA — the final payment also nets out any
//      product the plant rejected, which is already reflected in
//      tons_captured_final since that's the accepted/final tonnage).
//
// Adolfo (sept 2026): "days worked" is NOT always the same as the faena's
// días de pesca — the mechanic often starts before the pilot arrives or
// stays after they leave, so their contract day-count can differ from the
// pilot's and from the faena's own fishing_days. That's why this function
// takes `workDays` (this specific person's contract days for THIS faena),
// resolved per-person by the caller (campaigns.pilot_start_date/
// pilot_end_date vs mechanic_start_date/mechanic_end_date, falling back to
// the faena's own start_date/end_date when a person doesn't have their own
// override) — see resolveWorkDays() below and lib/faena-metrics.ts for
// fishing_days, which remains a separate, faena-level operational metric
// (used for ton/día ratios, not for payroll).
//
// Verified example (Caroní II, marea M01, pilot Doman León): workDays=32,
// monthly=4500, rate_per_ton=10, tons_estimate=1000, tons_final=952 →
// proratedSalary=4800, tonBonusAdvance=8000, tonBonusFinal=9520,
// tonBonusRemainder=1520 — matches the spreadsheet's own N18/O18 to the cent.

const STANDARD_MONTH_DAYS = 30;
const ADVANCE_SHARE = 0.8;

export type PayrollInput = {
  monthlySalary: number | null;
  ratePerTon: number | null;
  /** THIS PERSON's contract days worked on this faena — not necessarily the
   * faena's días de pesca (see resolveWorkDays()). */
  workDays: number | null;
  tonsCapturedEstimate: number | null;
  tonsCapturedFinal: number | null;
  /** Ad hoc cash advances given outside the 80/20 formula (the sheet's
   * "Anticipos" column) — netted against the final settlement. */
  extraAdvance: number | null;
};

/** Inclusive day count between two ISO dates (end - start + 1), same formula
 * as FishingDaysField / resolveFishingDays in app/campaigns/actions.ts —
 * kept in sync so a work-day range and the faena's own date range never
 * disagree on how days are counted. */
export function daysBetweenInclusive(startDate: string | null | undefined, endDate: string | null | undefined): number | null {
  if (!startDate || !endDate) return null;
  const diff = Math.round((new Date(`${endDate}T00:00:00Z`).getTime() - new Date(`${startDate}T00:00:00Z`).getTime()) / 86400000) + 1;
  return diff > 0 ? diff : null;
}

/** Resolves a person's own work-day range for a faena, falling back to the
 * faena's own start/end dates when that person doesn't have an override
 * (the common case — most faenas the pilot and mechanic arrive/leave
 * together). Returns both the resolved date range (for display, e.g. "Días
 * laborados del X al Y") and the day count. */
export function resolveWorkDays(
  personStartDate: string | null | undefined,
  personEndDate: string | null | undefined,
  campaignStartDate: string | null | undefined,
  campaignEndDate: string | null | undefined
): { startDate: string | null; endDate: string | null; days: number | null } {
  const startDate = personStartDate || campaignStartDate || null;
  const endDate = personEndDate || campaignEndDate || null;
  return { startDate, endDate, days: daysBetweenInclusive(startDate, endDate) };
}

export type PayrollBreakdown = {
  proratedSalary: number | null;
  tonBonusAdvance: number | null;
  tonBonusFinal: number | null;
  tonBonusRemainder: number | null;
  extraAdvance: number;
  /** Paid once the faena closes and the dock/estimated weight is known. */
  firstPayment: number | null;
  /** Paid once the processing plant's final weigh-in report arrives. */
  finalPayment: number | null;
  /** Full amount owed for the faena (salary portion + full ton bonus). */
  total: number | null;
};

export function calculatePayroll(input: PayrollInput): PayrollBreakdown {
  const proratedSalary =
    input.monthlySalary != null && input.workDays != null
      ? (input.monthlySalary / STANDARD_MONTH_DAYS) * input.workDays
      : null;

  const tonBonusAdvance =
    input.ratePerTon != null && input.tonsCapturedEstimate != null
      ? input.ratePerTon * input.tonsCapturedEstimate * ADVANCE_SHARE
      : null;

  const tonBonusFinal =
    input.ratePerTon != null && input.tonsCapturedFinal != null ? input.ratePerTon * input.tonsCapturedFinal : null;

  const tonBonusRemainder = tonBonusFinal != null ? tonBonusFinal - (tonBonusAdvance ?? 0) : null;

  const extraAdvance = input.extraAdvance ?? 0;

  const firstPayment =
    proratedSalary != null || tonBonusAdvance != null ? (proratedSalary ?? 0) + (tonBonusAdvance ?? 0) : null;

  const finalPayment = tonBonusRemainder != null ? tonBonusRemainder - extraAdvance : null;

  const total = proratedSalary != null || tonBonusFinal != null ? (proratedSalary ?? 0) + (tonBonusFinal ?? 0) : null;

  return { proratedSalary, tonBonusAdvance, tonBonusFinal, tonBonusRemainder, extraAdvance, firstPayment, finalPayment, total };
}
