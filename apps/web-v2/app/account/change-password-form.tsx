"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function ChangePasswordForm() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("Las dos contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(`No se pudo cambiar la contraseña: ${updateError.message}`);
      return;
    }

    setPassword("");
    setConfirm("");
    setSuccess(true);
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      {error ? <div className="hsv-error-banner mb-0">{error}</div> : null}
      {success ? <p className="rounded-md bg-status-green/10 p-3 text-sm text-status-green">Contraseña actualizada.</p> : null}
      <label className="grid gap-1.5 text-sm font-semibold text-ink">
        Contraseña nueva
        <input
          className="hsv-control"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>
      <label className="grid gap-1.5 text-sm font-semibold text-ink">
        Repite la contraseña nueva
        <input
          className="hsv-control"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
        />
      </label>
      <button className="hsv-primary-button mt-2 w-full" type="submit" disabled={loading}>
        {loading ? "Guardando..." : "Cambiar contraseña"}
      </button>
    </form>
  );
}
