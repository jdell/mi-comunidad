import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, Eye, Megaphone, Pencil, Pin, PinOff, Plus } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireMember } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatRelative } from "@/lib/format";
import { isManager, ROLE_LABELS } from "@/lib/roles";
import { signedUrls } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { togglePin } from "./actions";

export const metadata: Metadata = { title: "Anuncios" };

export default async function AnnouncementsPage({ params }: PageProps<"/c/[id]/anuncios">) {
  const { id } = await params;
  const { member } = await requireMember(id);
  const manager = isManager(member.role);

  const [announcements, activeMembers] = await Promise.all([
    db.announcement.findMany({
      where: { comunidadId: id },
      include: {
        author: { select: { displayName: true, role: true, unit: { select: { label: true } } } },
        _count: { select: { reads: true } },
        reads: { where: { memberId: member.id }, select: { memberId: true } },
      },
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
      take: 50,
    }),
    db.comunidadMember.count({ where: { comunidadId: id, status: "ACTIVE" } }),
  ]);

  // Mark everything shown as read for this member.
  const unread = announcements.filter((a) => a.reads.length === 0).map((a) => a.id);
  if (unread.length) {
    await db.announcementRead.createMany({
      data: unread.map((announcementId) => ({ announcementId, memberId: member.id })),
      skipDuplicates: true,
    });
  }

  const images = await signedUrls(announcements.map((a) => a.imagePath).filter((p): p is string => !!p));

  return (
    <>
      <PageHeader
        title="Anuncios"
        description="El tablón de la comunidad."
        actions={
          manager && (
            <Button asChild>
              <Link href={`/c/${id}/anuncios/nuevo`}>
                <Plus /> Nuevo anuncio
              </Link>
            </Button>
          )
        }
      />
      {announcements.length === 0 ? (
        <EmptyState
          icon={<Megaphone className="size-5" />}
          title="Todavía no hay anuncios"
          description={manager ? "Publica el primero: llegará por email a todos los vecinos." : "Cuando la junta publique algo, lo verás aquí."}
        />
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <Card key={a.id} id={a.id} className={cn("scroll-mt-20", a.pinned && "border-primary/50 bg-accent/30")}>
              <CardContent className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {a.pinned && (
                        <Badge variant="secondary">
                          <Pin /> Fijado
                        </Badge>
                      )}
                      {a.urgent && (
                        <Badge variant="destructive">
                          <AlertTriangle /> Urgente
                        </Badge>
                      )}
                      {unread.includes(a.id) && <Badge>Nuevo</Badge>}
                    </div>
                    <h2 className="text-lg font-semibold leading-snug">{a.title}</h2>
                  </div>
                  {manager && (
                    <div className="flex shrink-0 gap-1">
                      <form action={togglePin}>
                        <input type="hidden" name="comunidadId" value={id} />
                        <input type="hidden" name="announcementId" value={a.id} />
                        <Button size="icon-sm" variant="ghost" aria-label={a.pinned ? "Desfijar" : "Fijar"}>
                          {a.pinned ? <PinOff /> : <Pin />}
                        </Button>
                      </form>
                      <Button asChild size="icon-sm" variant="ghost" aria-label="Editar">
                        <Link href={`/c/${id}/anuncios/${a.id}/editar`}>
                          <Pencil />
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>
                <p className="whitespace-pre-line text-sm leading-relaxed">{a.body}</p>
                {a.imagePath && images[a.imagePath] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={images[a.imagePath]} alt="" className="max-h-80 w-full rounded-xl object-cover" />
                )}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>
                    {a.author.displayName} ({ROLE_LABELS[a.author.role].toLowerCase()}
                    {a.author.unit ? `, ${a.author.unit.label}` : ""}) · {formatRelative(a.createdAt)}
                  </span>
                  {manager && (
                    <span className="flex items-center gap-1">
                      <Eye className="size-3.5" /> Leído por {a._count.reads} de {activeMembers}
                      {a.notifiedAt ? ` · Email a ${a.recipientsCount}` : ""}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
