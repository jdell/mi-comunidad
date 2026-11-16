import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { formatDate, formatDateTime } from "@/lib/format";
import { IDEA_STATUS, votesLabel } from "@/lib/ideas";
import { IdeaAdminForm, MergeForm } from "./forms";

export const metadata = { title: "Sugerencia" };

export default async function AdminIdea({ params }: PageProps<"/admin/sugerencias/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const idea = await db.featureIdea.findUnique({
    where: { id },
    include: {
      author: { select: { name: true, email: true, phone: true, deletedAt: true } },
      comunidad: { select: { id: true, name: true, plan: true } },
      mergedInto: { select: { id: true, title: true } },
      merged: { select: { id: true, title: true, createdAt: true }, orderBy: { createdAt: "asc" } },
      _count: { select: { votes: true } },
    },
  });
  if (!idea) notFound();

  const targets = idea.mergedIntoId
    ? []
    : await db.featureIdea.findMany({
        where: { id: { not: id }, mergedIntoId: null },
        orderBy: [{ votes: { _count: "desc" } }, { createdAt: "desc" }],
        take: 200,
        select: { id: true, title: true, _count: { select: { votes: true } } },
      });
  const author = idea.author && !idea.author.deletedAt ? idea.author : null;

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
        <Link href="/admin/sugerencias"><ArrowLeft /> Sugerencias</Link>
      </Button>
      <PageHeader
        title={idea.title}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={IDEA_STATUS[idea.status].className}>{IDEA_STATUS[idea.status].label}</Badge>
            <span>{votesLabel(idea._count.votes)} · {formatDateTime(idea.createdAt)}</span>
          </span>
        }
      />
      {idea.mergedInto && (
        <p className="mb-4 rounded-lg border bg-muted/50 px-3 py-2 text-sm">
          Fusionada con <Link href={`/admin/sugerencias/${idea.mergedInto.id}`} className="font-medium text-primary hover:underline">{idea.mergedInto.title}</Link>. No aparece en el tablero.
        </p>
      )}
      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Descripción</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="whitespace-pre-line">{idea.description}</p>
              <div className="border-t pt-3 text-xs text-muted-foreground">
                <p>Autor: {author ? [author.name, author.email ?? author.phone].filter(Boolean).join(" · ") || "—" : "Anónimo (cuenta eliminada)"}</p>
                {idea.comunidad && (
                  <p>
                    Desde <Link href={`/admin/comunidades/${idea.comunidad.id}`} className="text-primary hover:underline">{idea.comunidad.name}</Link> ({idea.comunidad.plan.toLowerCase()})
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
          {idea.merged.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Duplicadas fusionadas aquí</CardTitle></CardHeader>
              <CardContent className="divide-y text-sm">
                {idea.merged.map((m) => (
                  <Link key={m.id} href={`/admin/sugerencias/${m.id}`} className="flex justify-between gap-2 py-2 hover:text-primary">
                    <span className="truncate">{m.title}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{formatDate(m.createdAt, { month: "short" })}</span>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Gestión</CardTitle></CardHeader>
            <CardContent><IdeaAdminForm idea={{ id: idea.id, status: idea.status, response: idea.response, adminNote: idea.adminNote }} /></CardContent>
          </Card>
          {!idea.mergedIntoId && targets.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Duplicada</CardTitle></CardHeader>
              <CardContent>
                <MergeForm ideaId={idea.id} targets={targets.map((t) => ({ id: t.id, title: t.title, votes: t._count.votes }))} />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
