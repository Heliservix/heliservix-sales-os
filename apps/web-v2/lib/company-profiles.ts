// Las dos empresas de Adolfo desde las que se pueden emitir cartas/informes
// oficiales. Adolfo (sept 2026): "PACIFIC HELICOPTER SUPPLIES... es quien les
// solicita a cada propietaria el pago por los honorarios de 80%, días lab.,
// y 20% de pilotos y mecánicos, así mismo es la que les factura a cada
// propietario por el servicio de mantenimiento y administración de
// contratos atuneros" — RUC 1683552-1-682806 DV 14, y él es el Gerente
// General. HeliServiX OS (el software) también existe como marca propia y
// puede usarse como membrete alternativo. Ambas comparten la misma
// dirección/teléfonos (oficina física en el hangar de Panamá) — solo cambia
// el nombre/logo/RUC. Adolfo elige cuál usar carta por carta, así que esto
// NO depende del barco/pesquera (eso se dejó de usar como membrete — ver
// vessels.letterhead_* que ahora solo se usa, si se quiere, como datos del
// destinatario, no del remitente).
export type CompanyProfileId = "pacific" | "heliservix";

export type CompanyProfile = {
  id: CompanyProfileId;
  legalName: string;
  ruc: string | null;
  addressLines: string[];
  phones: string[];
  logoSrc: string;
  /** Quien firma en representación de la empresa — Adolfo pidió que su
   * nombre aparezca siempre al final de informes y cartas de solicitud,
   * como responsable de las gestiones. */
  signerName: string;
  signerTitle: string;
};

const SHARED_ADDRESS = ["República de Panamá, Ciudad de Panamá", "Aeropuerto Marcos A. Gelabert, Hangar 16-B"];
const SHARED_PHONES = ["+507-3151317", "+507-3835181", "Cel: +507-69490444"];

export const COMPANY_PROFILES: Record<CompanyProfileId, CompanyProfile> = {
  pacific: {
    id: "pacific",
    legalName: "PACIFIC HELICOPTER SUPPLIES",
    ruc: "1683552-1-682806 DV 14",
    addressLines: SHARED_ADDRESS,
    phones: SHARED_PHONES,
    logoSrc: "/brand/pacific-helicopter-supplies-logo.png",
    signerName: "Adolfo Spinali",
    signerTitle: "Gerente General"
  },
  heliservix: {
    id: "heliservix",
    legalName: "HELISERVIX",
    ruc: null,
    addressLines: SHARED_ADDRESS,
    phones: SHARED_PHONES,
    logoSrc: "/brand/heliservix-logo.png",
    signerName: "Adolfo Spinali",
    signerTitle: "Gerente General"
  }
};

export function resolveCompanyProfile(value: string | undefined | null): CompanyProfile {
  return COMPANY_PROFILES[value === "heliservix" ? "heliservix" : "pacific"];
}
