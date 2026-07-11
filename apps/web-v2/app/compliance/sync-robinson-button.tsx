"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

type SyncResponse = {
  checked?: number;
  added?: number;
  newItems?: { referenceNumber: string; title: string }[];
  warning?: string;
  error?: string;
};

export function SyncRobinsonButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  function handleClick() {
    setMessage(null);
    setIsError(false);
    startTransition(async () => {
      try {
        const response = await fetch("/api/compliance/sync-robinson");
        const body = (await response.json()) as SyncResponse;

        if (!response.ok || body.error) {
          setIsError(true);
          setMessage(body.error ?? "No se pudo verificar robinsonheli.com.");
          return;
        }
        if (body.warning) {
          setIsError(true);
          setMessage(body.warning);
          return;
        }

        const added = body.added ?? 0;
        setMessage(
          added > 0
            ? `Se agregaron ${added} boletín(es) nuevo(s): ${(body.newItems ?? []).map((i) => i.referenceNumber).join(", ")}.`
            : `Revisado — sin boletines nuevos (${body.checked ?? 0} publicaciones R44 verificadas).`
        );
        router.refresh();
      } catch (err) {
        setIsError(true);
        setMessage(`Error de red al conectar con robinsonheli.com: ${(err as Error).message}`);
      }
    });
  }

  return (
    <div className="flex flex-col items-start gap-1.5 sm:items-end">
      <button type="button" onClick={handleClick} disabled={isPending} className="hsv-secondary-button">
        <RefreshCw className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`} aria-hidden="true" />
        {isPending ? "Buscando..." : "Buscar boletines nuevos"}
      </button>
      {message ? <p className={`max-w-xs text-xs sm:text-right ${isError ? "text-status-red" : "text-ink-subtle"}`}>{message}</p> : null}
    </div>
  );
}
