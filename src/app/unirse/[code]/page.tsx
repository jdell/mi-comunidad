import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Building2 } from "lucide-react";
import { Logo } from "@/components/logo";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { resolveInviteCode, unclaimedUnits } from "@/lib/invitations";
import { JoinForm } from "./join-form";

export const metadata: Metadata = { title: "Unirse a la comunidad" };

export default async function JoinPage({ params }: PageProps<"/unirse/[code]">) {
  const { code } = await params;
  const resolved = await resolveInviteCode(code);
  if (!resolved) notFound();
  const { comunidad, invitation, invalid } = resolved;

  const [user, membersCount, president] = await Promise.all([
    getCurrentUser(),
    db.comunidadMember.count({ where: { comunidadId: comunidad.id, status: "ACTIVE" } }),
    db.comunidadMember.findFirst({
      where: { comunidadId: comunidad.id, role: "PRESIDENT", status: "ACTIVE" },
      select: { displayName: true },
    }),
  ]);

  if (user) {
    const existing = await db.comunidadMember.findUnique({
      where: { comunidadId_userId: { comunidadId: comunidad.id, userId: user.id } },
    });
    if (existing?.status === "ACTIVE") redirect(`/c/${comunidad.id}`);
  }

  const units = invitation?.unit ? [invitation.unit] : await unclaimedUnits(comunidad.id);

  return (
    <div className="flex min-h-dvh flex-col bg-[radial-gradient(ellipse_at_top,var(--color-secondary),transparent_60%)]">
      <header className="p-4">
        <Logo />
      </header>
      <main className="flex flex-1 justify-center px-4 pb-16">
        <div className="w-full max-w-sm space-y-5 pt-6">
          <p className="text-center text-muted-foreground">Te han invitado a unirte a:</p>
          <Card>
            <CardContent className="flex gap-4">
              <div className="h-fit rounded-xl bg-secondary p-3 text-secondary-foreground">
                <Building2 className="size-6" />
              </div>
              <div className="space-y-0.5">
                <p className="font-heading text-lg font-semibold">{comunidad.name}</p>
                <p className="text-sm text-muted-foreground">{comunidad.address}</p>
                <p className="text-sm text-muted-foreground">
                  {membersCount} {membersCount === 1 ? "vecino registrado" : "vecinos registrados"}
                  {president ? ` · Presidente: ${president.displayName}` : ""}
                </p>
              </div>
            </CardContent>
          </Card>

          {invalid ? (
            <Alert variant="destructive">
              <AlertDescription>
                Esta invitación ya se ha usado o ha caducado. Pide un enlace nuevo a tu presidente.
              </AlertDescription>
            </Alert>
          ) : user ? (
            <JoinForm
              code={resolved.code}
              defaultName={invitation?.name ?? user.name ?? ""}
              units={units.map((u) => ({ id: u.id, label: u.label }))}
              lockedUnitId={invitation?.unitId ?? null}
              requiresApproval={!invitation && comunidad.approvalMode === "MANUAL"}
            />
          ) : (
            <div className="space-y-3">
              <Button asChild className="h-11 w-full">
                <Link href={`/login?next=${encodeURIComponent(`/unirse/${resolved.code}`)}`}>
                  Continuar con mi teléfono
                </Link>
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Te enviaremos un código por SMS para verificar tu número.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
