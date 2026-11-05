import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, Clock, Plus } from "lucide-react";
import { Logo } from "@/components/logo";
import { UserMenu } from "@/components/app/user-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { isPlatformAdminEmail } from "@/lib/admin";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ROLE_LABELS } from "@/lib/roles";

export const metadata: Metadata = { title: "Mis comunidades" };

export default async function ComunidadesPage() {
  const user = await requireUser("/c");
  const memberships = await db.comunidadMember.findMany({
    where: { userId: user.id, status: { in: ["ACTIVE", "PENDING"] } },
    include: { comunidad: true, unit: true },
    orderBy: { joinedAt: "asc" },
  });

  if (memberships.length === 0) redirect("/onboarding");
  const active = memberships.filter((m) => m.status === "ACTIVE");
  if (memberships.length === 1 && active.length === 1) redirect(`/c/${active[0]!.comunidadId}`);

  return (
    <div className="min-h-dvh">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <Logo href="/c" />
        <UserMenu name={user.name ?? user.email ?? user.phone ?? "Mi cuenta"} isAdmin={isPlatformAdminEmail(user.email)} />
      </header>
      <main className="mx-auto max-w-2xl space-y-4 p-4">
        <div className="flex items-center justify-between pt-4">
          <h1 className="text-2xl font-semibold">Mis comunidades</h1>
          <Button asChild variant="outline">
            <Link href="/onboarding">
              <Plus /> Añadir
            </Link>
          </Button>
        </div>
        {memberships.map((m) => {
          const pending = m.status === "PENDING";
          const content = (
            <Card className={pending ? "opacity-75" : "transition-colors hover:border-primary"}>
              <CardContent className="flex items-center gap-4">
                <div className="rounded-xl bg-secondary p-3 text-secondary-foreground">
                  <Building2 className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{m.comunidad.name}</p>
                  <p className="truncate text-sm text-muted-foreground">{m.comunidad.address}</p>
                </div>
                {pending ? (
                  <Badge variant="outline">
                    <Clock /> Pendiente de aprobación
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    {ROLE_LABELS[m.role]}
                    {m.unit ? ` · ${m.unit.label}` : ""}
                  </Badge>
                )}
              </CardContent>
            </Card>
          );
          return pending ? (
            <div key={m.id}>{content}</div>
          ) : (
            <Link key={m.id} href={`/c/${m.comunidadId}`} className="block">
              {content}
            </Link>
          );
        })}
      </main>
    </div>
  );
}
