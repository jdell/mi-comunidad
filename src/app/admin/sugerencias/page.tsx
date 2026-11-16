import Link from "next/link";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { IdeaStatus } from "@/generated/prisma/enums";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { IDEA_STATUS, IDEA_STATUSES } from "@/lib/ideas";
import { cn } from "@/lib/utils";

export const metadata = { title: "Sugerencias" };

export default async function AdminIdeas({ searchParams }: PageProps<"/admin/sugerencias">) {
  await requireAdmin();
  const sp = await searchParams;
  const status = typeof sp.estado === "string" && (IDEA_STATUSES as readonly string[]).includes(sp.estado) ? (sp.estado as IdeaStatus) : null;
  const orden = sp.orden === "recientes" ? "recientes" : "votos";

  const [ideas, counts, merged] = await Promise.all([
    db.featureIdea.findMany({
      where: { mergedIntoId: null, ...(status ? { status } : {}) },
      orderBy: orden === "votos" ? [{ votes: { _count: "desc" } }, { createdAt: "desc" }] : { createdAt: "desc" },
      take: 300,
      select: {
        id: true,
        title: true,
        status: true,
        createdAt: true,
        adminNote: true,
        comunidad: { select: { name: true } },
        _count: { select: { votes: true, merged: true } },
      },
    }),
    db.featureIdea.groupBy({ by: ["status"], where: { mergedIntoId: null }, _count: { _all: true } }),
    db.featureIdea.count({ where: { mergedIntoId: { not: null } } }),
  ]);
  const countOf = (s: IdeaStatus) => counts.find((c) => c.status === s)?._count._all ?? 0;
  const total = IDEA_STATUSES.reduce((a, s) => a + countOf(s), 0);
  const href = (patch: { estado?: string | null; orden?: string | null }) => {
    const p = new URLSearchParams();
    const next = { estado: status, orden: orden === "votos" ? null : orden, ...patch };
    for (const [k, v] of Object.entries(next)) if (v) p.set(k, v);
    return p.size ? `/admin/sugerencias?${p}` : "/admin/sugerencias";
  };
  const chip = (active: boolean) => cn("rounded-full border px-3 py-1 text-sm", active ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted");

  return (
    <>
      <PageHeader title="Sugerencias" description={`${total} sugerencias · ${countOf("NEW")} nuevas sin revisar · ${merged} fusionadas`} />
      <div className="mb-4 flex flex-wrap gap-2">
        <Link href={href({ estado: null })} className={chip(!status)}>Todas ({total})</Link>
        {IDEA_STATUSES.map((s) => (
          <Link key={s} href={href({ estado: s })} className={chip(status === s)}>{IDEA_STATUS[s].label} ({countOf(s)})</Link>
        ))}
        <span className="mx-1 h-7 w-px bg-border" aria-hidden />
        <Link href={href({ orden: null })} className={chip(orden === "votos")}>Más votadas</Link>
        <Link href={href({ orden: "recientes" })} className={chip(orden === "recientes")}>Recientes</Link>
      </div>
      <Card>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr><th className="py-2 text-right pr-3">Votos</th><th>Sugerencia</th><th>Estado</th><th className="text-right">Fecha</th></tr>
            </thead>
            <tbody className="divide-y">
              {ideas.length === 0 && (
                <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">No hay sugerencias.</td></tr>
              )}
              {ideas.map((i) => (
                <tr key={i.id} className="hover:bg-muted/50">
                  <td className="py-2.5 pr-3 text-right font-semibold tabular-nums">{i._count.votes}</td>
                  <td>
                    <Link href={`/admin/sugerencias/${i.id}`} className="font-medium hover:text-primary">{i.title}</Link>
                    <p className="text-xs text-muted-foreground">
                      {[i.comunidad?.name, i._count.merged ? `${i._count.merged} duplicada${i._count.merged === 1 ? "" : "s"}` : null, i.adminNote ? "con notas" : null]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </p>
                  </td>
                  <td><Badge variant="outline" className={IDEA_STATUS[i.status].className}>{IDEA_STATUS[i.status].label}</Badge></td>
                  <td className="text-right text-xs text-muted-foreground">{formatDate(i.createdAt, { month: "short" })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </>
  );
}
