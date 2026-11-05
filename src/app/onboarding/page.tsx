import type { Metadata } from "next";
import { Logo } from "@/components/logo";
import { UserMenu } from "@/components/app/user-menu";
import { cookies } from "next/headers";
import { Gift } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { REFERRAL_COOKIE } from "@/lib/referral-code";
import { resolveReferrer } from "@/lib/referrals";
import { CreateComunidadForm, JoinWithCodeForm } from "./forms";

export const metadata: Metadata = { title: "Empezar" };

export default async function OnboardingPage({ searchParams }: PageProps<"/onboarding">) {
  const user = await requireUser("/onboarding");
  const { ref } = await searchParams;
  const refCode = (typeof ref === "string" ? ref : null) ?? (await cookies()).get(REFERRAL_COOKIE)?.value ?? null;
  const referrer = await resolveReferrer(refCode, { userId: user.id });
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
          {referrer && (
            <p className="flex items-center gap-2 rounded-xl border border-primary/40 bg-accent/40 p-3 text-sm">
              <Gift className="size-4 shrink-0 text-primary" /> Vienes recomendado por <strong>{referrer.name}</strong>. ¡Bienvenido!
            </p>
          )}
          <CreateComunidadForm defaultName={user.name ?? ""} referralCode={referrer ? refCode : null} />
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
