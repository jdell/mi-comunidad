import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, Camera, Plus, Wrench } from "lucide-react";
import type { IncidenciaStatus } from "@/generated/prisma/enums";
import { EmptyState, PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireMember } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatRelative } from "@/lib/format";
import { INCIDENCIA_LOCATION } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { IncidenciaStatusBadge } from "./status-badge";

export const metadata: Metadata = { title: "Incidencias" };

const FILTERS: { key: string; label: string; statuses?: IncidenciaStatus[] }[] = [
  { key: "abiertas", label: "Abiertas", statuses: ["OPEN", "IN_PROGRESS"] },
  { key: "resueltas", label: "Resueltas", statuses: ["RESOLVED"] },
  { key: "todas", label: "Todas" },
];

export default async function IncidenciasPage({ params, searchParams }: PageProps<"/c/[id]/incidencias">) {
  const { id } = await params;
  const { estado } = await searchParams;
  await requireMember(id);
  const filter = FILTERS.find((f) => f.key === estado) ?? FILTERS[0]!;

  const incidencias = await db.incidencia.findMany({
    where: { comunidadId: id, ...(filter.statuses ? { status: { in: filter.statuses } } : {}) },
    include: { reporter: { select: { displayName: true, unit: { select: { label: true } } } } },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    take: 100,
  });

  return (
    <>
      <PageHeader
        title="Incidencias"
        description="Averías y problemas del edificio, de principio a fin."
        actions={
          <Button asChild>
            <Link href={`/c/${id}/incidencias/nueva`}>
              <Plus /> Reportar
            </Link>
          </Button>
        }
      />
      <div className="mb-4 flex gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={`/c/${id}/incidencias?estado=${f.key}`}
            className={cn(
              "rounded-full border px-3 py-1 text-sm",
              f.key === filter.key ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
            )}
          >
            {f.label}
          </Link>
        ))}
      </div>
      {incidencias.length === 0 ? (
        <EmptyState icon={<Wrench className="size-5" />} title="No hay incidencias" description="¡Todo en orden en el edificio!" />
      ) : (
        <div className="space-y-3">
          {incidencias.map((i) => (
            <Link key={i.id} href={`/c/${id}/incidencias/${i.id}`} className="block">
              <Card className="transition-colors hover:border-primary">
                <CardContent className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <p className="flex items-center gap-2 font-medium">
                      {i.priority === "URGENT" && <AlertTriangle className="size-4 shrink-0 text-destructive" />}
                      <span className="truncate">{i.title}</span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {INCIDENCIA_LOCATION[i.location]} · {i.reporter.displayName}
                      {i.reporter.unit ? ` (${i.reporter.unit.label})` : ""} · {formatRelative(i.createdAt)}
                    </p>
                    {i.assignedTo && <p className="text-sm">Asignada a: {i.assignedTo}</p>}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <IncidenciaStatusBadge status={i.status} />
                    {i.photoPaths.length > 0 && (
                      <Badge variant="outline">
                        <Camera /> {i.photoPaths.length}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
