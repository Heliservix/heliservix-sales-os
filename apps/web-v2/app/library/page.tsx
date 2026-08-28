import Link from "next/link";
import { BookOpen, ExternalLink, FileText, Wrench, ShieldAlert, Info } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Panel } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status-pill";
import { SectionHeader } from "@/components/ui/section-header";

// Biblioteca Técnica Robinson — Adolfo pidió acceso directo al Manual de
// Mantenimiento y al Catálogo Ilustrado de Piezas de Robinson más recientes,
// para que todo técnico los tenga a mano desde el sistema.
//
// Diseño deliberado: esta página NO aloja copias de los PDF de Robinson.
// Enlaza directo a los archivos oficiales publicados por Robinson Helicopter
// Company en robinsonheli.com/publications. Dos razones:
//   1. Derechos de autor — los manuales, catálogos y boletines son material
//      protegido de RHC. Redistribuir copias propias sería una infracción.
//   2. Vigencia — Robinson revisa estos documentos con frecuencia (el Manual
//      de Mantenimiento R44 se revisó en abril 2026, el Catálogo de Piezas en
//      junio 2026). Enlazando directo a la fuente oficial, el técnico siempre
//      ve la versión más reciente sin que nosotros tengamos que actualizar
//      nada a mano.
//
// Los enlaces "acceso rápido" abajo se verificaron contra robinsonheli.com el
// 28 de agosto de 2026. Robinson cambia el nombre de archivo de sus PDF cada
// vez que publica una revisión, así que estos enlaces directos pueden dejar
// de funcionar cuando Robinson publique la próxima revisión — por eso el
// botón "Ir a robinsonheli.com/publications" siempre está primero y visible:
// es la fuente que nunca se desactualiza.
//
// Flota de HeliServiX = 100% Robinson R44 (confirmado en la base de datos:
// "Robinson R44" y "R44 CLIPPER I"), así que esta biblioteca solo cubre R44 —
// no se agregó contenido de R66/R22 porque no aplica a esta flota.

const VERIFIED_ON = "28 de agosto de 2026";
const ROBINSON_PUBLICATIONS_URL = "https://www.robinsonheli.com/publications";

type LibraryLink = {
  title: string;
  date: string;
  url: string;
};

const CORE_DOCUMENTS: LibraryLink[] = [
  {
    title: "R44 Manual de Mantenimiento (libro completo)",
    date: "Rev. Abr 2026",
    url: "https://robinsonstrapistorprod.blob.core.windows.net/uploads/assets/R44_MM_APR_2026_Full_Book_File_eda633f6d3.pdf"
  },
  {
    title: "R44 Catálogo Ilustrado de Piezas (libro completo)",
    date: "Rev. Jun 2026",
    url: "https://robinsonstrapistorprod.blob.core.windows.net/uploads/assets/r44_ipc_full_book_June_d8fba7141c.pdf"
  }
];

const PRACTICAL_DOCUMENTS: LibraryLink[] = [
  {
    title: "Listas de chequeo: Ground Check, Run Up, Flight Check y 100 Horas/Anual",
    date: "Rev. Abr 2026",
    url: "https://robinsonstrapistorprod.blob.core.windows.net/uploads/assets/r44_mm_checks_APR_2026_05a25b7607.pdf"
  },
  {
    title: "Esquema del sistema eléctrico (R44 MM)",
    date: "",
    url: "https://robinsonstrapistorprod.blob.core.windows.net/uploads/assets/r44_mm_electrical_006ed2dc09.pdf"
  },
  {
    title: "Archivo de revisión — Manual de Mantenimiento (Abr 2026)",
    date: "",
    url: "https://robinsonstrapistorprod.blob.core.windows.net/uploads/assets/R44_MM_APR_2026_Revision_File_cb0c9de7d7.pdf"
  },
  {
    title: "Archivo de revisión — Catálogo de Piezas (Jun 2026)",
    date: "",
    url: "https://robinsonstrapistorprod.blob.core.windows.net/uploads/assets/r44_ipc_jun2026_revision_new_47fe4a8ac4.pdf"
  }
];

const RECENT_SAFETY: LibraryLink[] = [
  {
    title: "R44 SB-119A — Conexiones de tubo push-pull servo-hidráulico a swashplate",
    date: "22 May 2026",
    url: "https://robinsonstrapistorprod.blob.core.windows.net/uploads/assets/R44_SB_119_A_R66_SB_45_A_d81aba03c5.pdf"
  },
  {
    title: "R44 SB-118A — Pernos de bisagra teetering y coning del rotor principal",
    date: "28 Jul 2026",
    url: "https://robinsonstrapistorprod.blob.core.windows.net/uploads/assets/R22_SB_123_A_R44_SB_118_A_R66_SB_44_A_0bd369e3bb.pdf"
  },
  {
    title: "R44 SL-89G",
    date: "25 Jun 2026",
    url: "https://robinsonstrapistorprod.blob.core.windows.net/uploads/assets/R44_SL_89_G_91bb20fb9d.pdf"
  }
];

function DocumentCard({ doc, icon: Icon }: { doc: LibraryLink; icon: typeof FileText }) {
  return (
    <a
      href={doc.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-start gap-3 rounded-lg border border-line bg-white px-4 py-3 shadow-control transition hover:border-aviation-blue/40 hover:shadow-panel dark:bg-canvas-muted/60"
    >
      <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-md border border-aviation-blue/15 bg-brand-lightBlue text-aviation-blue">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink group-hover:text-aviation-blue">{doc.title}</p>
        {doc.date ? <p className="mt-0.5 text-xs text-ink-subtle">{doc.date}</p> : null}
      </div>
      <ExternalLink className="mt-1 h-4 w-4 shrink-0 text-ink-subtle group-hover:text-aviation-blue" aria-hidden="true" />
    </a>
  );
}

export default function LibraryPage() {
  return (
    <AppShell>
      <SectionHeader
        eyebrow="Mantenimiento"
        title="Biblioteca Técnica Robinson"
        description="Acceso directo al Manual de Mantenimiento, Catálogo Ilustrado de Piezas y boletines de seguridad más recientes de Robinson para el Robinson R44 — la flota de HeliServiX."
        icon={BookOpen}
      />

      <Panel className="mb-5 border-aviation-blue/25 bg-brand-lightBlue/40">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-ink">Página oficial de Robinson Helicopter Company</p>
            <p className="mt-1 text-xs text-ink-subtle">
              La fuente que siempre tiene la versión más actual — todos los modelos (R44, R66, R22), todos los boletines,
              cartas de servicio y catálogos completos.
            </p>
          </div>
          <a
            href={ROBINSON_PUBLICATIONS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hsv-primary-button shrink-0"
          >
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
            Ir a robinsonheli.com/publications
          </a>
        </div>
      </Panel>

      <Panel className="mb-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-ink">Documentos principales — R44</h2>
          <StatusPill tone="teal">Verificado {VERIFIED_ON}</StatusPill>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {CORE_DOCUMENTS.map((doc) => (
            <DocumentCard key={doc.url} doc={doc} icon={FileText} />
          ))}
        </div>
      </Panel>

      <Panel className="mb-5">
        <h2 className="text-sm font-semibold text-ink">Listas de chequeo y referencias prácticas</h2>
        <p className="mt-1 text-xs text-ink-subtle">
          Para el trabajo diario en hangar: chequeos de rutina, esquema eléctrico y los archivos de revisión más
          recientes.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {PRACTICAL_DOCUMENTS.map((doc) => (
            <DocumentCard key={doc.url} doc={doc} icon={Wrench} />
          ))}
        </div>
      </Panel>

      <Panel className="mb-5">
        <h2 className="text-sm font-semibold text-ink">Boletines y cartas de servicio recientes</h2>
        <p className="mt-1 text-xs text-ink-subtle">
          Los más recientes publicados por Robinson para R44. Para el listado completo e histórico, usa el botón de
          Boletines en el menú o entra directo a la página oficial de Robinson.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {RECENT_SAFETY.map((doc) => (
            <DocumentCard key={doc.url} doc={doc} icon={ShieldAlert} />
          ))}
        </div>
        <Link href="/compliance/bulletins" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-aviation-blue hover:underline">
          Ver todos los boletines en HeliServiX OS →
        </Link>
      </Panel>

      <Panel className="border-aviation-amber/25 bg-aviation-amber/5">
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-aviation-amber" aria-hidden="true" />
          <div className="text-xs leading-5 text-ink-muted">
            <p className="font-semibold text-ink">Cómo confirmar que estás viendo la versión más reciente</p>
            <p className="mt-1">
              Robinson revisa estos manuales varias veces al año y cambia el nombre del archivo con cada revisión. Si un
              enlace de esta página no abre, es señal de que Robinson publicó una revisión nueva — entra directo a{" "}
              <a href={ROBINSON_PUBLICATIONS_URL} target="_blank" rel="noopener noreferrer" className="font-semibold text-aviation-blue hover:underline">
                robinsonheli.com/publications
              </a>{" "}
              y busca la pestaña R44. La fecha de revisión siempre aparece junto al nombre del documento.
            </p>
          </div>
        </div>
      </Panel>
    </AppShell>
  );
}
