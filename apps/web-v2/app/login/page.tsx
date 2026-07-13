import { LoginForm } from "@/app/login/login-form";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas-muted px-4">
      <div className="hsv-panel w-full max-w-sm">
        <div className="mb-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">HeliServiX OS</p>
          <h1 className="mt-1 text-xl font-semibold text-ink">Iniciar sesión</h1>
          <p className="mt-2 text-sm text-ink-subtle">
            Ingresa el correo y la contraseña que te dieron para entrar al sistema.
          </p>
        </div>
        <LoginForm nextPath={next && next.startsWith("/") ? next : "/"} />
      </div>
    </div>
  );
}
