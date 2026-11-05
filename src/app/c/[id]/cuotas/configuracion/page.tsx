import type { Metadata } from "next";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { requireMember } from "@/lib/auth";
import { db } from "@/lib/db";
import { FINANCE_ROLES } from "@/lib/roles";
import { CuotaConfigForm } from "./config-form";

export const metadata: Metadata = { title: "Configurar cuotas" };

export default async function CuotaConfigPage({ params }: PageProps<"/c/[id]/cuotas/configuracion">) {
  const { id } = await params;
  const { comunidad } = await requireMember(id, FINANCE_ROLES);
  const units = await db.unit.findMany({ where: { comunidadId: id }, orderBy: [{ floor: "asc" }, { label: "asc" }] });
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Configurar cuotas" description="Las cuotas se generan cada mes automáticamente con esta configuración." />
      <Card>
        <CardContent>
          <CuotaConfigForm
            comunidadId={id}
            config={comunidad}
            units={units.map((u) => ({ id: u.id, label: u.label, coefficient: u.coefficient.toNumber() }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
