import Image from "next/image";
import { notFound } from "next/navigation";
import { UserRoundCog } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Panel } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status-pill";
import { SectionHeader } from "@/components/ui/section-header";
import { supabase } from "@/lib/supabase";
import { updatePersonnel, archivePersonnel } from "@/app/personnel/actions";
import { personnelRoles, personnelStatuses } from "@/app/personnel/constants";
import { PersonnelPhotoUploadForm } from "@/app/personnel/photo-upload-form";
import { AccountAccessForm } from "@/app/personnel/account-access-form";
import { fetchFaenaData, computePersonnelFlightHours } from "@/lib/faena-metrics";
import { getPersonnelDocumentStatuses } from "@/lib/personnel-compliance";

export const dynamic = "force-dynamic";

type EditPersonnelPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditPersonnelPage({ params }: EditPersonnelPageProps) {
  const { id } = await params;
  const [{ data: person }, { data: helicopterData }, faenaData] = await Promise.all([
    supabase.from("personnel").select("*").eq("id", id).maybeSingle(),
    supabase.from("helicopters").select("registration, model").eq("archived", false),
    fetchFaenaData()
  ]);
  if (!person) notFound();

  const boundUpdate = updatePersonnel.bind(null, id);
  const boundArchive = archivePersonnel.bind(null, id);

  const helicopterModelByRegistration = new Map((helicopterData ?? []).map((h) => [h.registration, h.model]));
  const flightSummary =
    person.role === "Piloto" || person.role === "Mecánico"
      ? computePersonnelFlightHours(id, faenaData.campaigns, faenaData.flightLogs, helicopterModelByRegistration)
      : null;
  const totalHours = (flightSummary?.totalHours ?? 0) + Number(person.prior_experience_hours ?? 0);
  const documentStatuses = getPersonnelDocumentStatuses(person);

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <SectionHeader eyebrow="Personal" title={`Editar ${person.full_name}`} description={person.role} icon={UserRoundCog} />

        {flightSummary && person.role === "Piloto" ? (
          <Panel className="mb-5">
            <h2 className="text-sm font-semibold text-ink">Horas de vuelo (calculadas por el sistema)</h2>
            <p className="mt-1 text-xs text-ink-subtle">
              Suma de horas previas (manual) más lo volado en faenas asignadas a esta persona en Campañas. Solo cuenta faenas donde
              alguien la asignó como piloto — una faena importada del reporte semanal que nadie asignó todavía no suma aquí.
            </p>
            <p className="mt-2 text-2xl font-bold text-ink">{totalHours.toFixed(0)} hrs totales</p>
            {Object.keys(flightSummary.hoursByModel).length ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {Object.entries(flightSummary.hoursByModel).map(([model, hours]) => (
                  <StatusPill key={model} tone="neutral">
                    {model}: {hours.toFixed(0)} hrs
                  </StatusPill>
                ))}
              </div>
            ) : null}
            <p className="mt-2 text-xs text-ink-subtle">{flightSummary.faenas} faena(s) asignada(s) en el sistema.</p>
          </Panel>
        ) : null}

        {flightSummary && person.role === "Mecánico" ? (
          <Panel className="mb-5">
            <h2 className="text-sm font-semibold text-ink">Faenas realizadas</h2>
            <p className="mt-1 text-xs text-ink-subtle">
              Cuántas faenas tiene asignadas esta persona en Campañas desde que se registró en el sistema. Las horas de vuelo no
              aplican a un mecánico — esa métrica es solo para pilotos.
            </p>
            <p className="mt-2 text-2xl font-bold text-ink">{flightSummary.faenas} faena(s)</p>
          </Panel>
        ) : null}

        {documentStatuses.length ? (
          <Panel className="mb-5">
            <h2 className="text-sm font-semibold text-ink">Estado de documentos</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {documentStatuses.map((doc) => (
                <StatusPill key={doc.key} tone={doc.tone}>
                  {doc.label}: {doc.expiry}
                  {doc.daysUntil < 0 ? ` — vencido hace ${Math.abs(doc.daysUntil)} días` : ` — ${doc.daysUntil} días`}
                </StatusPill>
              ))}
            </div>
          </Panel>
        ) : null}

        <Panel className="mb-5">
          <h2 className="text-sm font-semibold text-ink">Acceso al sistema</h2>
          <p className="mt-1 text-xs text-ink-subtle">
            Con esto la persona puede entrar a HeliServiX OS con su propio usuario y contraseña. Un Mecánico entra al módulo de
            Mantenimiento y a Flota; un Piloto entra al Portal Técnico a subir sus reportes semanales; un Administrativo entra
            a todo el sistema, igual que Adolfo.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <StatusPill tone={person.account_invited_at ? "green" : "neutral"}>
              {person.account_invited_at ? "Con acceso" : "Sin acceso"}
            </StatusPill>
            {person.account_invited_at ? (
              <span className="text-xs text-ink-subtle">
                Creado el {new Date(person.account_invited_at).toLocaleDateString("es-PA")}
              </span>
            ) : null}
          </div>
          <div className="mt-3">
            <AccountAccessForm
              personnelId={id}
              hasEmail={Boolean(person.email)}
              isActive={person.status === "Active"}
              alreadyInvited={Boolean(person.account_invited_at)}
            />
          </div>
        </Panel>

        <Panel className="mb-5">
          <h2 className="mb-3 text-sm font-semibold text-ink">Fotos</h2>
          <div className="flex flex-wrap gap-6">
            <div className="flex flex-col items-start gap-2">
              {person.photo_url ? (
                <Image src={person.photo_url} alt={person.full_name} width={96} height={96} className="rounded-md object-cover" unoptimized />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-md bg-canvas-muted text-xs text-ink-subtle">Sin foto</div>
              )}
              <PersonnelPhotoUploadForm personnelId={id} kind="photo" hasPhoto={Boolean(person.photo_url)} label="Foto de la persona" />
            </div>
            <div className="flex flex-col items-start gap-2">
              {person.passport_photo_url ? (
                <Image
                  src={person.passport_photo_url}
                  alt={`Pasaporte de ${person.full_name}`}
                  width={96}
                  height={96}
                  className="rounded-md object-cover"
                  unoptimized
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-md bg-canvas-muted text-xs text-ink-subtle">Sin foto</div>
              )}
              <PersonnelPhotoUploadForm personnelId={id} kind="passport" hasPhoto={Boolean(person.passport_photo_url)} label="Foto del pasaporte" />
            </div>
            <div className="flex flex-col items-start gap-2">
              {person.seaman_book_photo_url ? (
                <Image
                  src={person.seaman_book_photo_url}
                  alt={`Seaman Book de ${person.full_name}`}
                  width={96}
                  height={96}
                  className="rounded-md object-cover"
                  unoptimized
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-md bg-canvas-muted text-xs text-ink-subtle">Sin foto</div>
              )}
              <PersonnelPhotoUploadForm
                personnelId={id}
                kind="seaman-book"
                hasPhoto={Boolean(person.seaman_book_photo_url)}
                label="Foto del Seaman Book (lee el N°, emisión y vencimiento solo)"
              />
            </div>
          </div>
        </Panel>

        <Panel>
          <form action={boundUpdate} className="grid gap-5 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-semibold text-ink sm:col-span-2">
              Nombre completo
              <input className="hsv-control" name="fullName" defaultValue={person.full_name} required />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Rol
              <select className="hsv-control" name="role" defaultValue={person.role}>
                {personnelRoles.map((role) => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Teléfono
              <input className="hsv-control" name="phone" defaultValue={person.phone ?? ""} />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Correo (para su acceso al Portal Técnico)
              <input className="hsv-control" type="email" name="email" defaultValue={person.email ?? ""} placeholder="Ej. nombre@correo.com" />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Salario mensual (USD)
              <input className="hsv-control" type="number" step="0.01" name="monthlySalary" defaultValue={person.monthly_salary ?? ""} />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Tarifa por tonelada capturada (USD)
              <input className="hsv-control" type="number" step="0.01" name="ratePerTon" defaultValue={person.rate_per_ton ?? ""} />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Estado
              <select className="hsv-control" name="status" defaultValue={person.status}>
                {personnelStatuses.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Helicóptero asignado (para AURA)
              <select
                className="hsv-control"
                name="assignedHelicopterRegistration"
                defaultValue={person.assigned_helicopter_registration ?? ""}
              >
                <option value="">Sin asignar — ve toda la flota</option>
                {(helicopterData ?? []).map((h) => (
                  <option key={h.registration} value={h.registration}>
                    {h.registration}
                    {h.model ? ` — ${h.model}` : ""}
                  </option>
                ))}
              </select>
              <span className="mt-0.5 text-xs font-normal text-ink-subtle">
                Solo aplica a un Mecánico — en AURA solo verá recomendaciones y análisis de esta aeronave.
              </span>
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink sm:col-span-2">
              Notas
              <textarea className="hsv-textarea" name="notes" defaultValue={person.notes ?? ""} />
            </label>

            <div className="sm:col-span-2">
              <h2 className="mt-2 border-t border-line pt-4 text-sm font-semibold text-ink">
                Documentos (licencia, médico, pasaporte — sobre todo para pilotos)
              </h2>
              <p className="mt-1 text-xs text-ink-subtle">
                Esto controla el cumplimiento de requisitos de las pólizas de seguro (módulo Pólizas) y avisa en Alertas cuando algo
                está por vencer.
              </p>
            </div>

            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Horas de experiencia previas (antes de este sistema)
              <input
                className="hsv-control"
                type="number"
                step="1"
                name="priorExperienceHours"
                defaultValue={person.prior_experience_hours ?? ""}
              />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              N° de licencia
              <input className="hsv-control" name="licenseNumber" defaultValue={person.license_number ?? ""} />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Tipo de licencia
              <input className="hsv-control" name="licenseType" defaultValue={person.license_type ?? ""} placeholder="Ej. PC Piloto Comercial" />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Vencimiento de licencia
              <input className="hsv-control" type="date" name="licenseExpiry" defaultValue={person.license_expiry ?? ""} />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Clase de certificado médico
              <input className="hsv-control" name="medicalCertificateClass" defaultValue={person.medical_certificate_class ?? ""} placeholder="Ej. Primera clase" />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Vencimiento de certificado médico
              <input className="hsv-control" type="date" name="medicalCertificateExpiry" defaultValue={person.medical_certificate_expiry ?? ""} />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Fecha de última recurrencia
              <input className="hsv-control" type="date" name="recurrencyDate" defaultValue={person.recurrency_date ?? ""} />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Vencimiento de recurrencia
              <input className="hsv-control" type="date" name="recurrencyExpiry" defaultValue={person.recurrency_expiry ?? ""} />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Fecha de último chequeo de vuelo
              <input className="hsv-control" type="date" name="flightCheckDate" defaultValue={person.flight_check_date ?? ""} />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Vencimiento de chequeo de vuelo
              <input className="hsv-control" type="date" name="flightCheckExpiry" defaultValue={person.flight_check_expiry ?? ""} />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              N° de pasaporte
              <input className="hsv-control" name="passportNumber" defaultValue={person.passport_number ?? ""} />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Vencimiento de pasaporte
              <input className="hsv-control" type="date" name="passportExpiry" defaultValue={person.passport_expiry ?? ""} />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              N° de Seaman Book (Libreta de Marino)
              <input className="hsv-control" name="seamanBookNumber" defaultValue={person.seaman_book_number ?? ""} />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Fecha de emisión del Seaman Book
              <input className="hsv-control" type="date" name="seamanBookIssueDate" defaultValue={person.seaman_book_issue_date ?? ""} />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              Vencimiento del Seaman Book
              <input className="hsv-control" type="date" name="seamanBookExpiry" defaultValue={person.seaman_book_expiry ?? ""} />
            </label>

            <div className="sm:col-span-2">
              <button className="hsv-primary-button" type="submit">
                Guardar cambios
              </button>
            </div>
          </form>
        </Panel>

        <Panel className="mt-5">
          <h2 className="text-sm font-semibold text-ink">Zona de riesgo</h2>
          <p className="mt-1 text-sm text-ink-subtle">
            Archivar quita a esta persona de las listas de asignación, pero conserva su historial en las faenas ya registradas.
          </p>
          <div className="mt-4">
            <form action={boundArchive}>
              <button className="hsv-danger-button" type="submit">
                Archivar
              </button>
            </form>
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
