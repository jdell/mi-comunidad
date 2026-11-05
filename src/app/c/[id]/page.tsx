import Link from "next/link";
import { CalendarDays, ChevronRight, Megaphone, Plus, UserPlus, Wrench } from "lucide-react";
import { PageHeader, StatCard } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireMember } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatRelative } from "@/lib/format";
import { isManager } from "@/lib/roles";
import { IncidenciaStatusBadge } from "./incidencias/status-badge";

export default async function ComunidadHome({ params }: PageProps<"/c/[id]">) {
  const { id } = await params;
  const { member, comunidad } = await requireMember(id);
  const manager = isManager(member.role);

  const [members, pending, openIncidencias, documents, announcements, incidencias] = await Promise.all([
    db.comunidadMember.count({ where: { comunidadId: id, status: "ACTIVE" } }),
    db.comunidadMember.count({ where: { comunidadId: id, status: "PENDING" } }),
    db.incidencia.count({ where: { comunidadId: id, status: { not: "RESOLVED" } } }),
    db.document.count({ where: { comunidadId: id } }),
    db.announcement.findMany({
      where: { comunidadId: id },
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
      take: 3,
      include: { author: { select: { displayName: true } } },
    }),
    db.incidencia.findMany({
      where: { comunidadId: id, status: { not: "RESOLVED" } },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      take: 3,
    }),
  ]);

  const quickActions = [
    manager && { href: `/c/${id}/anuncios/nuevo`, label: "Nuevo anuncio", icon: Megaphone },
    { href: `/c/${id}/incidencias/nueva`, label: "Reportar incidencia", icon: Wrench },
    manager && { href: `/c/${id}/invitar`, label: "Invitar vecinos", icon: UserPlus },
  ].filter(Boolean) as { href: string; label: string; icon: typeof Megaphone }[];

  return (
    <>
      <PageHeader title={`Hola, ${member.displayName.split(" ")[0]}`} description={`${comunidad.name} · ${comunidad.address}`} />

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="vecinos activos" value={members} hint={manager && pending ? `${pending} pendientes de aprobar` : undefined} />
        <StatCard label="incidencias abiertas" value={openIncidencias} />
        <StatCard label="documentos" value={documents} />
      </div>

      <section className="mt-6">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">Acciones rápidas</h2>
        <div className="grid gap-2 sm:grid-cols-3">
          {quickActions.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className="flex items-center gap-3 rounded-xl border bg-card p-3 transition-colors hover:border-primary">
              <span className="rounded-lg bg-primary/10 p-2 text-primary">
                <Icon className="size-4" />
              </span>
              <span className="font-medium">{label}</span>
              <Plus className="ml-auto size-4 text-muted-foreground" />
            </Link>
          ))}
        </div>
      </section>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Últimos anuncios</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href={`/c/${id}/anuncios`}>Ver todos <ChevronRight /></Link>
            </Button>
          </CardHeader>
          <CardContent className="divide-y">
            {announcements.length === 0 && <p className="text-sm text-muted-foreground">Sin anuncios todavía.</p>}
            {announcements.map((a) => (
              <Link key={a.id} href={`/c/${id}/anuncios#${a.id}`} className="block py-2.5 hover:text-primary">
                <p className="font-medium">{a.title}</p>
                <p className="text-xs text-muted-foreground">{a.author.displayName} · {formatRelative(a.createdAt)}</p>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Incidencias abiertas</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href={`/c/${id}/incidencias`}>Ver todas <ChevronRight /></Link>
            </Button>
          </CardHeader>
          <CardContent className="divide-y">
            {incidencias.length === 0 && <p className="text-sm text-muted-foreground">Ninguna incidencia abierta. 🎉</p>}
            {incidencias.map((i) => (
              <Link key={i.id} href={`/c/${id}/incidencias/${i.id}`} className="flex items-center justify-between gap-3 py-2.5 hover:text-primary">
                <div className="min-w-0">
                  <p className="truncate font-medium">{i.title}</p>
                  <p className="text-xs text-muted-foreground">{formatRelative(i.createdAt)}</p>
                </div>
                <IncidenciaStatusBadge status={i.status} />
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="size-4 text-primary" /> Próxima junta
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">No hay ninguna junta convocada.</p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
