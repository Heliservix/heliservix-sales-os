"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";

type VerifyResponse = {
  processed?: number;
  applicable?: number;
  notApplicable?: number;
  inconclusive?: number;
  errors?: number;
  sync?: { ok: boolean; added?: number; error?: string; warning?: string };
  error?: string;
};

export function VerifyBulletinsButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  function handleClick() {
    setMessage(null);
    setIsError(false);
    startTransition(async () => {
      try {
        const response = await fetch("/api/compliance/verify-bulletins");
        const body = (await response.json()) as VerifyResponse;

        if (!response.ok || body.error) {
          setIsError(true);
          setMessage(body.error ?? "No se pudo completar la verificación.");
          return;
        }

        const addedText = body.sync?.added ? ` ${body.sync.added} boletín(es) nuevo(s) encontrados.` : "";
        setMessage(
          `Verificados ${body.processed ?? 0} boletín(es) pendientes: ${body.applicable ?? 0} aplican, ${body.notApplicable ?? 0} no aplican, ${body.inconclusive ?? 0} necesitan confirmación manual.${addedText}`
        );
        router.refresh();
      } catch (err) {
        setIsError(true);
        setMessage(`Error de red al verificar boletines: ${(err as Error).message}`);
      }
    });
  }

  return (
    <div className="flex flex-col items-start gap-1.5 sm:items-end">
      <button type="button" onClick={handleClick} disabled={isPending} className="hsv-primary-button">
        <ShieldCheck className={`h-4 w-4 ${isPending ? "animate-pulse" : ""}`} aria-hidden="true" />
        {isPending ? "Verificando..." : "Verificar boletines ahora"}
      </button>
      {message ? <p className={`max-w-sm text-xs sm:text-right ${isError ? "text-status-red" : "text-ink-subtle"}`}>{message}</p> : null}
    </div>
  );
}
