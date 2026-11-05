import type { Metadata } from "next";
import { AlertTriangle, PartyPopper } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireMember } from "@/lib/auth";
import { db } from "@/lib/db";
import { BOARD_ROLES, isManager } from "@/lib/roles";
import { sumCoefficients } from "@/lib/units";
import { distributeEqually } from "./actions";
import { UnitRow } from "./unit-row";

export const metadata: Metadata = { title: "Viviendas" };

export default async function UnitsPage({ params, searchParams }: PageProps<"/c/[id]/unidades">) {
  const { id } = await params;
  const { bienvenida } = await searchParams;
  const { member } = await requireMember(id, BOARD_ROLES);
  const editable = isManager(member.role);

  const units = await db.unit.findMany({
    where: { comunidadId: id },
    include: { members: { where: { status: "ACTIVE" }, select: { displayName: true } } },
    orderBy: [{ floor: "asc" }, { label: "asc" }],
  });
  const total = sumCoefficients(units);
  const balanced = Math.abs(total - 100) < 0.01;

  return (
    <>
      <PageHeader
        title="Viviendas y coeficientes"
        description="El coeficiente de participación (LPH art. 5) pondera los votos y el reparto de gastos."
      />
      {bienvenida && (
        <Alert className="mb-4 border-success">
          <PartyPopper />
          <AlertTitle>¡Comunidad creada!</AlertTitle>
          <AlertDescription>
            Revisa los nombres de las viviendas y sus coeficientes (están en la escritura de división horizontal).
            Después, invita a tus vecinos.
          </AlertDescription>
        </Alert>
      )}
      {!balanced && (
        <Alert className="mb-4 border-warning">
          <AlertTriangle />
          <AlertTitle>Los coeficientes suman {total.toFixed(4).replace(".", ",")} %</AlertTitle>
          <AlertDescription>Deberían sumar 100 % para que las votaciones y derramas sean correctas.</AlertDescription>
        </Alert>
      )}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{units.length} viviendas · {total.toFixed(2).replace(".", ",")} %</CardTitle>
          {editable && (
            <form action={distributeEqually}>
              <input type="hidden" name="comunidadId" value={id} />
              <Button variant="outline" size="sm">Repartir a partes iguales</Button>
            </form>
          )}
        </CardHeader>
        <CardContent>
          <div className="hidden grid-cols-[1.2fr_0.8fr_0.8fr_1.2fr_auto] gap-2 pb-2 text-xs font-medium uppercase text-muted-foreground sm:grid sm:pr-48">
            <span>Vivienda</span><span>Planta</span><span>Puerta</span><span>Coeficiente %</span><span className="w-9" />
          </div>
          <div className="divide-y">
            {units.map((u) => (
              <UnitRow
                key={u.id}
                comunidadId={id}
                editable={editable}
                occupant={u.members[0]?.displayName ?? null}
                unit={{ id: u.id, label: u.label, floor: u.floor, door: u.door, coefficient: u.coefficient.toFixed(4) }}
              />
            ))}
          </div>
          {editable && (
            <div className="mt-4 border-t pt-4">
              <p className="mb-2 text-sm font-medium">Añadir vivienda, local o garaje</p>
              <UnitRow comunidadId={id} editable />
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
