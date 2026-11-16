import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Lightbulb, Search } from "lucide-react";
import { Logo } from "@/components/logo";
import { UserMenu } from "@/components/app/user-menu";
import { EmptyState } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Prisma } from "@/generated/prisma/client";
import type { IdeaStatus } from "@/generated/prisma/enums";
import { isPlatformAdminEmail } from "@/lib/admin";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { IDEA_SORTS, IDEA_STATUS, IDEA_STATUSES, type IdeaSort, VOTABLE_STATUSES } from "@/lib/ideas";
import { cn } from "@/lib/utils";
import { IdeaForm } from "./idea-form";
import { VoteButton } from "./vote-button";

export const metadata: Metadata = { title: "Sugerencias" };

export default async function IdeasPage({ searchParams }: PageProps<"/sugerencias">) {
  const user = await requireUser("/sugerencias");
  const sp = await searchParams;
  const str = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");
  const sort: IdeaSort = str(sp.orden) === "recientes" ? "recientes" : "populares";
  const status = (IDEA_STATUSES as readonly string[]).includes(str(sp.estado)) ? (str(sp.estado) as IdeaStatus) : null;
  const q = str(sp.q).trim().slice(0, 80);
  const c = str(sp.c);
  // Only link back to a comunidad the user actually belongs to.
  const from = c
    ? await db.comunidadMember.findUnique({
        where: { comunidadId_userId: { comunidadId: c, userId: user.id } },
        select: { status: true, comunidad: { select: { id: true, name: true } } },
      })
    : null;
  const comunidad = from?.status === "ACTIVE" ? from.comunidad : null;

  const where: Prisma.FeatureIdeaWhereInput = {
    mergedIntoId: null,
    status: status ?? { not: "DISMISSED" },
    ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { description: { contains: q, mode: "insensitive" } }] } : {}),
  };
  const ideas = await db.featureIdea.findMany({
    where,
    orderBy: sort === "populares" ? [{ votes: { _count: "desc" } }, { createdAt: "desc" }] : { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      response: true,
      createdAt: true,
      authorId: true,
      _count: { select: { votes: true } },
      votes: { where: { userId: user.id }, select: { userId: true } },
    },
  });

  const href = (patch: Record<string, string | null>) => {
    const params = new URLSearchParams();
    const next = { orden: sort === "populares" ? null : sort, estado: status, q: q || null, c: comunidad?.id ?? null, ...patch };
    for (const [k, v] of Object.entries(next)) if (v) params.set(k, v);
    const s = params.toString();
    return s ? `/sugerencias?${s}` : "/sugerencias";
  };

  return (
    <div className="min-h-dvh">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <Logo href={comunidad ? `/c/${comunidad.id}` : "/c"} />
        <UserMenu name={user.name ?? user.email ?? user.phone ?? "Mi cuenta"} isAdmin={isPlatformAdminEmail(user.email)} />
      </header>
      <main className="mx-auto max-w-3xl space-y-6 p-4 py-8">
        {comunidad && (
          <Button asChild variant="ghost" size="sm" className="-ml-2">
            <Link href={`/c/${comunidad.id}`}><ArrowLeft /> {comunidad.name}</Link>
          </Button>
        )}
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Sugerencias</h1>
          <p className="text-muted-foreground">
            ¿Qué echas en falta para gestionar tu comunidad? Propón ideas y vota las de otros presidentes y vecinos: las más votadas
            nos ayudan a decidir qué hacemos a continuación.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Proponer una idea</CardTitle>
            <CardDescription>Antes de enviarla, busca si alguien ya la ha propuesto y vótala.</CardDescription>
          </CardHeader>
          <CardContent>
            <IdeaForm comunidadId={comunidad?.id} />
          </CardContent>
        </Card>

        <div className="space-y-3">
          <form action="/sugerencias" className="relative">
            {comunidad && <input type="hidden" name="c" value={comunidad.id} />}
            {status && <input type="hidden" name="estado" value={status} />}
            {sort !== "populares" && <input type="hidden" name="orden" value={sort} />}
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input name="q" defaultValue={q} placeholder="Buscar sugerencias…" className="pl-9" aria-label="Buscar sugerencias" />
          </form>
          <div className="flex flex-wrap items-center gap-2">
            {(Object.keys(IDEA_SORTS) as IdeaSort[]).map((s) => (
              <Chip key={s} href={href({ orden: s === "populares" ? null : s })} active={sort === s}>{IDEA_SORTS[s]}</Chip>
            ))}
            <span className="mx-1 h-5 w-px bg-border" aria-hidden />
            <Chip href={href({ estado: null })} active={!status}>Abiertas</Chip>
            {IDEA_STATUSES.map((s) => (
              <Chip key={s} href={href({ estado: s })} active={status === s}>{IDEA_STATUS[s].label}</Chip>
            ))}
          </div>
        </div>

        {ideas.length === 0 ? (
          <EmptyState
            icon={<Lightbulb />}
            title={q ? "No hay sugerencias que coincidan" : "Todavía no hay sugerencias aquí"}
            description={q ? "Prueba con otras palabras o propón tú la idea." : "Sé el primero en proponer una idea."}
          />
        ) : (
          <ul className="space-y-3">
            {ideas.map((idea) => (
              <li key={idea.id} className="flex gap-3 rounded-2xl border bg-card p-4">
                <VoteButton
                  ideaId={idea.id}
                  votes={idea._count.votes}
                  voted={idea.votes.length > 0}
                  disabled={!VOTABLE_STATUSES.includes(idea.status)}
                />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-medium">{idea.title}</h2>
                    <Badge variant="outline" className={IDEA_STATUS[idea.status].className} title={IDEA_STATUS[idea.status].description}>
                      {IDEA_STATUS[idea.status].label}
                    </Badge>
                    {idea.authorId === user.id && <Badge variant="secondary">Tuya</Badge>}
                  </div>
                  <p className="text-sm whitespace-pre-line text-muted-foreground">{idea.description}</p>
                  {idea.response && (
                    <p className="rounded-lg border-l-2 border-primary bg-muted/50 px-3 py-2 text-sm">
                      <span className="font-medium">Respuesta del equipo: </span>
                      {idea.response}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">{formatDate(idea.createdAt)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

function Chip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={cn("rounded-full border px-3 py-1 text-sm", active ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted")}
      aria-current={active ? "page" : undefined}
    >
      {children}
    </Link>
  );
}
