"use client";

import { useState } from "react";

export type NonRoutineHelicopterOption = {
  registration: string;
  model: string;
  currentHourmeter: number | null;
};

type FieldValues = {
  helicopterRegistration: string;
  aircraftModel: string;
  totalTimeHours: string;
};

type NonRoutineAircraftFieldsProps = {
  helicopters: NonRoutineHelicopterOption[];
  defaults: FieldValues;
};

// Al elegir un helicóptero de la flota, se llenan automáticamente el
// modelo de aeronave y las horas totales (el horómetro actual) — el
// técnico puede corregir las horas si el reporte es de un momento distinto.
export function NonRoutineAircraftFields({ helicopters, defaults }: NonRoutineAircraftFieldsProps) {
  const [values, setValues] = useState<FieldValues>(defaults);

  function handleHelicopterChange(registration: string) {
    if (!registration) {
      setValues((prev) => ({ ...prev, helicopterRegistration: "" }));
      return;
    }
    const match = helicopters.find((h) => h.registration === registration);
    if (!match) return;
    setValues((prev) => ({
      ...prev,
      helicopterRegistration: registration,
      aircraftModel: match.model || prev.aircraftModel,
      totalTimeHours: match.currentHourmeter != null ? String(match.currentHourmeter) : prev.totalTimeHours
    }));
  }

  return (
    <>
      <label className="grid gap-1.5 text-sm font-semibold text-ink">
        Helicóptero de la flota (opcional)
        <select
          className="hsv-control"
          name="helicopterRegistration"
          value={values.helicopterRegistration}
          onChange={(e) => handleHelicopterChange(e.target.value)}
        >
          <option value="">Externo / no está en la flota</option>
          {helicopters.map((h) => (
            <option key={h.registration} value={h.registration}>
              {h.registration} — {h.model}
            </option>
          ))}
        </select>
        <span className="text-xs font-normal text-ink-subtle">
          Al elegir un helicóptero de la flota se llenan automáticamente el modelo y el horómetro actual.
        </span>
      </label>
      <label className="grid gap-1.5 text-sm font-semibold text-ink">
        Modelo de aeronave
        <input
          className="hsv-control"
          name="aircraftModel"
          placeholder="Ej. Robinson R44"
          value={values.aircraftModel}
          onChange={(e) => setValues((prev) => ({ ...prev, aircraftModel: e.target.value }))}
        />
      </label>
      <label className="grid gap-1.5 text-sm font-semibold text-ink">
        Horas totales (Total Time)
        <input
          className="hsv-control"
          type="number"
          step="0.1"
          name="totalTimeHours"
          value={values.totalTimeHours}
          onChange={(e) => setValues((prev) => ({ ...prev, totalTimeHours: e.target.value }))}
        />
      </label>
    </>
  );
}
