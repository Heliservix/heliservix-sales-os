// Payroll calculator for pilots/mechanics assigned to a faena, matching the
// office's own working spreadsheet ("estatus 2026.xlsx" — FAENAS 2026 CARONI)
// and the real Pacific Helicopter Supplies contracts (pilot: $4,500/mo +
// $10/ton; mechanic: $3,500/mo + $6/ton — verified against Doman León and
// Ricardo Solís/Melvi García's contracts). Both the contract text and the
// spreadsheet's own arithmetic agree on the same two-part structure:
//
//   1. Monthly salary is prorated by the faena's duration in days over a
//      standard 30-day month ("PAGO X DIA LAB" in the sheet) and paid in
//      full up front — it is NOT part of the 80/20 split.
//   2. The per-ton bonus (personnel.rate_per_ton × tons) IS split: 80% is
//      advanced once the dock/estimated weight is known, and the remaining
//      balance is settled once the processing plant's final weigh-in comes
//      back (contract clause CUARTA — the final payment also nets out any
//      product the plant rejected, which is already reflected in
//      tons_captured_final since that's the accepted/final tonnage).
//
// Verified example (Caroní II, marea M01, pilot Doman León): fishing_days=32,
// monthly=4500, rate_per_ton=10, tons_estimate=1000, tons_final=952 →
// proratedSalary=4800, tonBonusAdvance=8000, tonBonusFinal=9520,
// tonBonusRemainder=1520 — matches the spreadsheet's own N18/O18 to the cent.

const STANDARD_MONTH_DAYS = 30;
const ADVANCE_SHARE = 0.8;

export type PayrollInput = {
  monthlySalary: number | null;
  ratePerTon: number | null;
  fishingDays: number | null;
  tonsCapturedEstimate: number | null;
  tonsCapturedFinal: number | null;
  /** Ad hoc cash advances given outside the 80/20 formula (the sheet's
   * "Anticipos" column) — netted against the final settlement. */
  extraAdvance: number | null;
};

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
    input.monthlySalary != null && input.fishingDays != null
      ? (input.monthlySalary / STANDARD_MONTH_DAYS) * input.fishingDays
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
