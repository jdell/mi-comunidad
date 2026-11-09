import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { UpgradeNotice } from "@/components/app/upgrade-notice";
import { getEntitlements, requireMember } from "@/lib/auth";
import { hasFeature } from "@/lib/entitlements";
import { addMonths, periodOf } from "@/lib/cuotas";
import { db } from "@/lib/db";
import { formatCents, formatDate } from "@/lib/format";
import { FINANCE_ROLES } from "@/lib/roles";
import { deleteDerrama } from "../actions";
import { DerramaCalculator } from "./derrama-calculator";

export const metadata: Metadata = { title: "Derramas" };

export default async function DerramasPage({ params }: PageProps<"/c/[id]/cuotas/derramas">) {
  const { id } = await params;
  const { comunidad } = await requireMember(id, FINANCE_ROLES);
  const entitlements = await getEntitlements(comunidad);
  const [units, derramas] = await Promise.all([
    db.unit.findMany({
      where: { comunidadId: id },
      include: { members: { where: { status: "ACTIVE" }, select: { displayName: true }, take: 1 } },
      orderBy: [{ floor: "asc" }, { label: "asc" }],
    }),
    db.derrama.findMany({
      where: { comunidadId: id },
      include: { cuotas: { select: { amountCents: true, status: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="mx-auto max-w-4xl">
      <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
        <Link href={`/c/${id}/cuotas`}><ArrowLeft /> Cuotas</Link>
      </Button>
      <PageHeader title="Derramas" description="Gastos extraordinarios repartidos según el coeficiente de cada vivienda." />
      {!hasFeature(entitlements, "derramas") && <UpgradeNotice comunidadId={id} feature="La calculadora de derramas" />}

      {derramas.length > 0 && (
        <div className="mb-6 space-y-3">
          {derramas.map((d) => {
            const collected = d.cuotas.filter((c) => c.status === "PAID").reduce((a, c) => a + c.amountCents, 0);
            const anyPaid = d.cuotas.some((c) => c.status === "PAID");
            return (
              <Card key={d.id}>
                <CardHeader className="flex flex-row items-start justify-between gap-3">
                  <div className="space-y-1.5">
                    <CardTitle>{d.title}</CardTitle>
                    <CardDescription>
                      {formatCents(d.totalCents)} · {d.installments} {d.installments === 1 ? "plazo" : "plazos"} · desde {formatDate(d.firstDueDate)}
                    </CardDescription>
                  </div>
                  {!anyPaid && (
                    <form action={deleteDerrama}>
                      <input type="hidden" name="comunidadId" value={id} />
                      <input type="hidden" name="derramaId" value={d.id} />
                      <Button size="icon-sm" variant="ghost" aria-label="Eliminar derrama"><Trash2 className="text-destructive" /></Button>
                    </form>
                  )}
                </CardHeader>
                <CardContent className="space-y-1">
                  <Progress value={(collected / d.totalCents) * 100} />
                  <p className="text-xs text-muted-foreground">Cobrado {formatCents(collected)} de {formatCents(d.totalCents)}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Calculadora de derrama</CardTitle>
          <CardDescription>Introduce el importe y verás lo que paga cada vivienda. Al aprobarla se generan los cobros.</CardDescription>
        </CardHeader>
        <CardContent>
          <DerramaCalculator
            comunidadId={id}
            defaultPeriod={addMonths(periodOf(new Date()), 1)}
            units={units.map((u) => ({ id: u.id, label: u.label, coefficient: u.coefficient.toNumber(), owner: u.members[0]?.displayName ?? null }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
