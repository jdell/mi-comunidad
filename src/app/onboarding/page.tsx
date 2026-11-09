import type { Metadata } from "next";
import { Logo } from "@/components/logo";
import { UserMenu } from "@/components/app/user-menu";
import { requireUser } from "@/lib/auth";
import { CreateComunidadForm, JoinWithCodeForm } from "./forms";

export const metadata: Metadata = { title: "Empezar" };

export default async function OnboardingPage() {
  const user = await requireUser("/onboarding");
  return (
    <div className="min-h-dvh">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <Logo href="/c" />
        <UserMenu name={user.name ?? user.email ?? user.phone ?? "Mi cuenta"} />
      </header>
      <main className="mx-auto grid max-w-4xl gap-6 p-4 py-8 md:grid-cols-[1fr_320px]">
        <section className="space-y-4">
          <div>
            <h1 className="text-2xl font-semibold">Crea tu comunidad</h1>
            <p className="text-muted-foreground">
              Tardas 2 minutos. Serás el presidente y podrás invitar a tus vecinos.
            </p>
          </div>
          <CreateComunidadForm defaultName={user.name ?? ""} />
        </section>
        <aside className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">¿Te han invitado?</h2>
            <p className="text-sm text-muted-foreground">
              Introduce el código que te ha enviado tu presidente o escanea el QR del portal.
            </p>
          </div>
          <JoinWithCodeForm />
        </aside>
      </main>
    </div>
  );
}
