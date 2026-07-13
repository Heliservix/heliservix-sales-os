"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function LoginForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createSupabaseBrowserClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);

    if (signInError) {
      setError(
        signInError.message.toLowerCase().includes("invalid")
          ? "Correo o contraseña incorrectos. Verifica que los escribiste bien."
          : `No se pudo iniciar sesión: ${signInError.message}`
      );
      return;
    }

    router.replace(nextPath);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      {error ? <div className="hsv-error-banner mb-0">{error}</div> : null}
      <label className="grid gap-1.5 text-sm font-semibold text-ink">
        Correo electrónico
        <input
          className="hsv-control"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </label>
      <label className="grid gap-1.5 text-sm font-semibold text-ink">
        Contraseña
        <input
          className="hsv-control"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>
      <button className="hsv-primary-button mt-2 w-full" type="submit" disabled={loading}>
        {loading ? "Ingresando…" : "Ingresar"}
      </button>
      <p className="text-center text-xs text-ink-subtle">
        ¿No tienes usuario o contraseña? Pídeselo a Adolfo.
      </p>
    </form>
  );
}
