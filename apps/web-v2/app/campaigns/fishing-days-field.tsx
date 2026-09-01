"use client";

import { useRef, useState } from "react";

type FishingDaysFieldProps = {
  defaultStartDate: string;
  defaultEndDate: string;
  defaultFishingDays: string;
};

// Adolfo (Ago 2026): "necesito que el faenas, calcule automaticamente los
// dias de pesca en resumen de captura segun fecha inicial y final de
// campaña". Días de pesca alimenta el prorrateo de sueldo de piloto/mecánico
// (lib/payroll.ts, verificado contra contratos reales) — por eso NO se
// reemplaza por un cálculo forzado sin opción de corrección: se autocompleta
// cada vez que cambia una de las dos fechas (fecha final − fecha inicial + 1,
// inclusive), pero el campo sigue siendo un input normal que el usuario
// puede corregir a mano si una faena en particular tuvo días de tránsito o
// mal tiempo que no fueron pesca real — esa corrección se guarda igual que
// antes en fishing_days y no se vuelve a pisar a menos que cambie una fecha.
function daysBetweenInclusive(start: string, end: string): number | null {
  if (!start || !end) return null;
  const startDate = new Date(`${start}T00:00:00Z`);
  const endDate = new Date(`${end}T00:00:00Z`);
  const diff = Math.round((endDate.getTime() - startDate.getTime()) / 86400000) + 1;
  return diff > 0 ? diff : null;
}

export function FishingDaysField({ defaultStartDate, defaultEndDate, defaultFishingDays }: FishingDaysFieldProps) {
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);
  const [fishingDays, setFishingDays] = useState(defaultFishingDays);
  const userEditedDays = useRef(false);

  function recalculate(nextStart: string, nextEnd: string) {
    // Una vez que alguien corrige "Días de pesca" a mano, ya no se vuelve a
    // pisar automáticamente solo porque se ajustó una fecha por otro motivo
    // (ej. corregir un typo en el día) — respeta esa corrección hasta que
    // alguien la borre y deje que se recalcule de nuevo.
    if (userEditedDays.current) return;
    const computed = daysBetweenInclusive(nextStart, nextEnd);
    if (computed != null) setFishingDays(String(computed));
  }

  return (
    <>
      <label className="grid gap-1.5 text-sm font-semibold text-ink">
        Fecha inicio
        <input
          className="hsv-control"
          type="date"
          name="startDate"
          value={startDate}
          onChange={(e) => {
            setStartDate(e.target.value);
            recalculate(e.target.value, endDate);
          }}
        />
      </label>
      <label className="grid gap-1.5 text-sm font-semibold text-ink">
        Fecha fin
        <input
          className="hsv-control"
          type="date"
          name="endDate"
          value={endDate}
          onChange={(e) => {
            setEndDate(e.target.value);
            recalculate(startDate, e.target.value);
          }}
        />
      </label>
      <label className="grid gap-1.5 text-sm font-semibold text-ink">
        Días de pesca
        <input
          className="hsv-control"
          type="number"
          step="1"
          name="fishingDays"
          value={fishingDays}
          onChange={(e) => {
            if (e.target.value === "") {
              // Campo vaciado a propósito: vuelve a dejar que se calcule
              // solo la próxima vez que cambie una fecha.
              userEditedDays.current = false;
              setFishingDays("");
              recalculate(startDate, endDate);
              return;
            }
            userEditedDays.current = true;
            setFishingDays(e.target.value);
          }}
        />
        <span className="text-xs font-normal text-ink-subtle">
          Se calcula solo con fecha inicio y fin (ambas incluidas) — corrígelo a mano si esta faena tuvo días de tránsito o
          mal tiempo que no fueron pesca real.
        </span>
      </label>
    </>
  );
}
