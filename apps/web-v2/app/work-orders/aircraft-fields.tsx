"use client";

import { useState } from "react";

export type WorkOrderHelicopterOption = {
  registration: string;
  model: string;
  serialNumber: string | null;
  ownerCompany: string | null;
  engineModel: string | null;
  engineSerial: string | null;
};

type FieldValues = {
  helicopterRegistration: string;
  clientName: string;
  clientPhone: string;
  clientAddress: string;
  aircraftType: string;
  aircraftRegistration: string;
  aircraftSerial: string;
  engineType: string;
  engineModel: string;
  engineSerial: string;
};

type WorkOrderAircraftFieldsProps = {
  helicopters: WorkOrderHelicopterOption[];
  defaults: FieldValues;
};

// Al elegir un helicóptero de la flota, se llenan automáticamente el
// cliente (dueño), la aeronave (tipo/matrícula/S-N) y el motor (modelo/S-N)
// a partir de lo que ya está guardado para esa aeronave — el técnico no
// tiene que volver a escribirlo. Los campos quedan editables por si algo
// cambió (ej. cambio de motor) desde la última actualización.
export function WorkOrderAircraftFields({ helicopters, defaults }: WorkOrderAircraftFieldsProps) {
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
      clientName: match.ownerCompany || prev.clientName,
      aircraftType: match.model || prev.aircraftType,
      aircraftRegistration: match.registration,
      aircraftSerial: match.serialNumber || prev.aircraftSerial,
      engineModel: match.engineModel || prev.engineModel,
      engineSerial: match.engineSerial || prev.engineSerial
    }));
  }

  function field(key: keyof FieldValues) {
    return {
      value: values[key],
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => setValues((prev) => ({ ...prev, [key]: e.target.value }))
    };
  }

  return (
    <>
      <div className="sm:col-span-2">
        <h2 className="text-sm font-semibold text-ink">Cliente</h2>
      </div>
      <label className="grid gap-1.5 text-sm font-semibold text-ink">
        Cliente
        <input className="hsv-control" name="clientName" placeholder="Ej. Heliser Vix Inc." {...field("clientName")} />
      </label>
      <label className="grid gap-1.5 text-sm font-semibold text-ink">
        Teléfono
        <input className="hsv-control" name="clientPhone" {...field("clientPhone")} />
      </label>
      <label className="grid gap-1.5 text-sm font-semibold text-ink sm:col-span-2">
        Dirección
        <input className="hsv-control" name="clientAddress" {...field("clientAddress")} />
      </label>

      <div className="sm:col-span-2 border-t border-line pt-4">
        <h2 className="text-sm font-semibold text-ink">Aeronave</h2>
      </div>
      <label className="grid gap-1.5 text-sm font-semibold text-ink sm:col-span-2">
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
          Al elegir un helicóptero de la flota se llenan automáticamente el cliente, la aeronave y el motor — corrígelos si algo cambió.
        </span>
      </label>
      <label className="grid gap-1.5 text-sm font-semibold text-ink">
        Aeronave (tipo)
        <input className="hsv-control" name="aircraftType" placeholder="Ej. Robinson R44" {...field("aircraftType")} />
      </label>
      <label className="grid gap-1.5 text-sm font-semibold text-ink">
        Matrícula
        <input className="hsv-control" name="aircraftRegistration" placeholder="Ej. HP-1804" {...field("aircraftRegistration")} />
      </label>
      <label className="grid gap-1.5 text-sm font-semibold text-ink">
        S/N aeronave
        <input className="hsv-control" name="aircraftSerial" {...field("aircraftSerial")} />
      </label>
      <label className="grid gap-1.5 text-sm font-semibold text-ink">
        Motor
        <input className="hsv-control" name="engineType" {...field("engineType")} />
      </label>
      <label className="grid gap-1.5 text-sm font-semibold text-ink">
        Modelo (motor)
        <input className="hsv-control" name="engineModel" {...field("engineModel")} />
      </label>
      <label className="grid gap-1.5 text-sm font-semibold text-ink">
        S/N motor
        <input className="hsv-control" name="engineSerial" {...field("engineSerial")} />
      </label>
    </>
  );
}
