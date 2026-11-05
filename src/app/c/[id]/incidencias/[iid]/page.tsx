import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft, MapPin } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireMember } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { INCIDENCIA_LOCATION, INCIDENCIA_STATUS } from "@/lib/labels";
import { isManager } from "@/lib/roles";
import { signedUrls } from "@/lib/storage";
import { IncidenciaStatusBadge } from "../status-badge";
import { UpdateIncidenciaForm } from "./update-form";

export const metadata: Metadata = { title: "Incidencia" };

export default async function IncidenciaPage({ params }: PageProps<"/c/[id]/incidencias/[iid]">) {
  const { id, iid } = await params;
  const { member } = await requireMember(id);
  const incidencia = await db.incidencia.findFirst({
    where: { id: iid, comunidadId: id },
    include: {
      reporter: { select: { displayName: true, unit: { select: { label: true } } } },
      updates: { include: { author: { select: { displayName: true } } }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!incidencia) notFound();
  const photos = await signedUrls(incidencia.photoPaths);

  return (
    <div className="mx-auto max-w-3xl">
      <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
        <Link href={`/c/${id}/incidencias`}>
          <ArrowLeft /> Incidencias
        </Link>
      </Button>
      <PageHeader
        title={incidencia.title}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <IncidenciaStatusBadge status={incidencia.status} />
            {incidencia.priority === "URGENT" && (
              <Badge variant="destructive">
                <AlertTriangle /> Urgente
              </Badge>
            )}
            <span className="inline-flex items-center gap-1 text-sm">
              <MapPin className="size-3.5" /> {INCIDENCIA_LOCATION[incidencia.location]}
            </span>
          </span>
        }
      />
      <div className="space-y-4">
        <Card>
          <CardContent className="space-y-4">
            <p className="whitespace-pre-line">{incidencia.description}</p>
            {incidencia.photoPaths.length > 0 && (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {incidencia.photoPaths.map((p) =>
                  photos[p] ? (
                    <a key={p} href={photos[p]} target="_blank" rel="noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photos[p]} alt="Foto de la incidencia" className="aspect-square w-full rounded-lg object-cover" />
                    </a>
                  ) : null,
                )}
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              Reportada por {incidencia.reporter.displayName}
              {incidencia.reporter.unit ? ` (${incidencia.reporter.unit.label})` : ""} · {formatDateTime(incidencia.createdAt)}
              {incidencia.assignedTo ? ` · Asignada a ${incidencia.assignedTo}` : ""}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Seguimiento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {incidencia.updates.length > 0 && (
              <ol className="space-y-4 border-l pl-4">
                {incidencia.updates.map((u) => (
                  <li key={u.id} className="relative">
                    <span className="absolute -left-[21px] top-1.5 size-2.5 rounded-full bg-primary" />
                    <p className="text-sm">
                      <span className="font-medium">{u.author.displayName}</span>
                      {u.status && <> cambió el estado a <strong>{INCIDENCIA_STATUS[u.status].label}</strong></>}
                      <span className="text-muted-foreground"> · {formatDateTime(u.createdAt)}</span>
                    </p>
                    {u.note && <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{u.note}</p>}
                  </li>
                ))}
              </ol>
            )}
            <UpdateIncidenciaForm
              comunidadId={id}
              incidenciaId={incidencia.id}
              manager={isManager(member.role)}
              status={incidencia.status}
              assignedTo={incidencia.assignedTo}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
