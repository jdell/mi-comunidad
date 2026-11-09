import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, Plus } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireMember } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { JUNTA_STATUS_LABELS, JUNTA_TYPE_LABELS } from "@/lib/juntas";
import { isManager } from "@/lib/roles";

export const metadata: Metadata = { title: "Juntas" };

export default async function JuntasPage({ params }: PageProps<"/c/[id]/juntas">) {
  const { id } = await params;
  const { member } = await requireMember(id);
  const manager = isManager(member.role);
  const juntas = await db.junta.findMany({
    where: { comunidadId: id, ...(manager ? {} : { status: { not: "DRAFT" } }) },
    include: { _count: { select: { agendaItems: true } } },
    orderBy: { scheduledAt: "desc" },
  });
  const now = new Date();
  const upcoming = juntas.filter((j) => j.scheduledAt >= now || j.status === "EN_CURSO" || j.status === "DRAFT").reverse();
  const past = juntas.filter((j) => !upcoming.includes(j));

  const row = (j: (typeof juntas)[number]) => (
    <Link key={j.id} href={`/c/${id}/juntas/${j.id}`} className="block">
      <Card className="transition-colors hover:border-primary">
        <CardContent className="flex items-center gap-4">
          <div className="rounded-xl bg-secondary p-3 text-secondary-foreground">
            <CalendarDays className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium">Junta {JUNTA_TYPE_LABELS[j.type].toLowerCase()}</p>
            <p className="text-sm text-muted-foreground">
              {formatDateTime(j.scheduledAt)} · {j.location} · {j._count.agendaItems} puntos
            </p>
          </div>
          <Badge variant={j.status === "EN_CURSO" ? "default" : j.status === "CONVOCADA" ? "secondary" : "outline"}>
            {JUNTA_STATUS_LABELS[j.status]}
          </Badge>
        </CardContent>
      </Card>
    </Link>
  );

  return (
    <>
      <PageHeader
        title="Juntas"
        description="Convocatorias, votaciones y actas conforme a la Ley de Propiedad Horizontal."
        actions={
          manager && (
            <Button asChild>
              <Link href={`/c/${id}/juntas/nueva`}>
                <Plus /> Convocar junta
              </Link>
            </Button>
          )
        }
      />
      {juntas.length === 0 ? (
        <EmptyState icon={<CalendarDays className="size-5" />} title="Aún no hay juntas" description="Cuando se convoque una junta aparecerá aquí con su orden del día." />
      ) : (
        <div className="space-y-6">
          {upcoming.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Próximas</h2>
              {upcoming.map(row)}
            </section>
          )}
          {past.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Anteriores</h2>
              {past.map(row)}
            </section>
          )}
        </div>
      )}
    </>
  );
}
