import type { Metadata } from "next";
import { AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireMember } from "@/lib/auth";
import { db } from "@/lib/db";
import { leaveComunidad } from "./actions";
import { ComunidadForm, ProfileForm } from "./forms";
import { ReferralCard } from "./referral-card";

export const metadata: Metadata = { title: "Ajustes" };

export default async function SettingsPage({ params, searchParams }: PageProps<"/c/[id]/ajustes">) {
  const { id } = await params;
  const { error } = await searchParams;
  const { member, comunidad } = await requireMember(id);

  const units = await db.unit.findMany({
    where: {
      comunidadId: id,
      OR: [
        { id: member.unitId ?? "" },
        { members: { none: { status: { in: ["ACTIVE", "PENDING"] } } } },
      ],
    },
    orderBy: [{ floor: "asc" }, { label: "asc" }],
    select: { id: true, label: true },
  });

  return (
    <>
      <PageHeader title="Ajustes" />
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Mi perfil en la comunidad</CardTitle>
            <CardDescription>Así te verán el resto de vecinos.</CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileForm comunidadId={id} member={member} units={units} />
          </CardContent>
        </Card>

        {member.role === "PRESIDENT" && (
          <Card>
            <CardHeader>
              <CardTitle>Datos de la comunidad</CardTitle>
            </CardHeader>
            <CardContent>
              <ComunidadForm comunidad={comunidad} />
            </CardContent>
          </Card>
        )}

        {member.role === "PRESIDENT" && <ReferralCard comunidadId={id} />}

        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle>Abandonar comunidad</CardTitle>
            <CardDescription>Dejarás de recibir avisos y perderás el acceso.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(error === "presidente" || member.role === "PRESIDENT") && (
              <Alert variant="destructive">
                <AlertTriangle />
                <AlertTitle>Eres el presidente</AlertTitle>
                <AlertDescription>Transfiere el rol a otro vecino antes de salir de la comunidad.</AlertDescription>
              </Alert>
            )}
            <form action={leaveComunidad}>
              <input type="hidden" name="comunidadId" value={id} />
              <Button variant="destructive" disabled={member.role === "PRESIDENT"}>
                Abandonar comunidad
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
