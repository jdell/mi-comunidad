import type { Metadata } from "next";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { safeNext } from "@/lib/urls";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = safeNext(typeof params.next === "string" ? params.next : null);
  const error = typeof params.error === "string" ? params.error : null;

  return (
    <div className="flex min-h-dvh flex-col bg-[radial-gradient(ellipse_at_top,var(--color-accent),transparent_60%)]">
      <header className="flex items-center justify-between p-4">
        <Logo />
        <ThemeToggle />
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pt-8 pb-16 sm:items-center sm:pt-0">
        <div className="w-full max-w-sm space-y-6">
          <div className="space-y-1 text-center">
            <h1 className="text-3xl font-semibold tracking-tight">Tu comunidad, digitalizada</h1>
            <p className="text-muted-foreground">Entra o regístrate con tu móvil, email o Google.</p>
          </div>
          <LoginForm next={next} initialError={error} />
          <p className="text-center text-xs text-muted-foreground">
            Al continuar aceptas los <a className="underline" href="/terminos">términos</a> y la{" "}
            <a className="underline" href="/privacidad">política de privacidad</a>.
          </p>
        </div>
      </main>
    </div>
  );
}
