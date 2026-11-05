import Link from "next/link";
import { PageHeader, StatCard } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { computeEntitlements } from "@/lib/entitlements";
import { formatCents, formatRelative } from "@/lib/format";
import { PLANS } from "@/lib/plans";
import { npsScore } from "@/lib/nps";
import { ACTIVE_STATUSES, mrrOf } from "@/lib/revenue";

export const metadata = { title: "Resumen" };

const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000);

export default async function AdminDashboard() {
  await requireAdmin();
  const since30 = daysAgo(30);
  const [comunidades, vecinos, activeSubs, signups30, recent, billing, npsRows, notifications30] = await Promise.all([
    db.comunidad.count(),
    db.comunidadMember.count({ where: { status: "ACTIVE" } }),
    db.comunidad.count({ where: { plan: { not: "GRATIS" }, subscriptionStatus: { in: [...ACTIVE_STATUSES] } } }),
    db.comunidad.count({ where: { createdAt: { gte: since30 } } }),
    db.comunidad.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        members: { where: { role: "PRESIDENT", status: "ACTIVE" }, select: { displayName: true }, take: 1 },
        _count: { select: { members: { where: { status: "ACTIVE" } } } },
      },
    }),
    db.comunidad.findMany({ select: { plan: true, subscriptionStatus: true, trialEndsAt: true, createdAt: true, unitsCount: true } }),
    db.npsResponse.findMany({ where: { score: { not: null }, createdAt: { gte: daysAgo(180) } }, select: { score: true } }),
    db.notificationLog.groupBy({ by: ["channel"], where: { createdAt: { gte: since30 } }, _count: true }),
  ]);
  const nps = npsScore(npsRows.map((r) => r.score!));
  const sent = (channel: "EMAIL" | "WHATSAPP") => notifications30.find((n) => n.channel === channel)?._count ?? 0;
  const mrr = billing.reduce((a, c) => a + mrrOf(c), 0);
  const trials = billing.filter((c) => computeEntitlements(c).trialActive).length;

  return (
    <>
      <PageHeader title="Resumen de la plataforma" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="comunidades" value={comunidades} hint={`+${signups30} en 30 días`} />
        <StatCard label="vecinos activos" value={vecinos} />
        <StatCard label="suscripciones activas" value={activeSubs} hint={`${trials} en prueba`} />
        <StatCard label="MRR" value={formatCents(mrr, { round: true })} hint={`ARR ${formatCents(mrr * 12, { round: true })}`} />
        <StatCard label="NPS (180 días)" value={nps === null ? "—" : nps} hint={`${npsRows.length} respuestas · objetivo > 40`} />
        <StatCard label="avisos por WhatsApp (30 días)" value={sent("WHATSAPP")} />
        <StatCard label="emails enviados (30 días)" value={sent("EMAIL")} />
      </div>
      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Últimas altas</CardTitle>
          <Link href="/admin/comunidades" className="text-sm text-primary hover:underline">Ver todas</Link>
        </CardHeader>
        <CardContent className="divide-y">
          {recent.map((c) => (
            <Link key={c.id} href={`/admin/comunidades/${c.id}`} className="flex items-center justify-between gap-3 py-2.5 hover:text-primary">
              <div className="min-w-0">
                <p className="truncate font-medium">{c.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {c.city ?? c.address} · {c.members[0]?.displayName ?? "sin presidente"} · {c.unitsCount} viviendas · {c._count.members} vecinos
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge variant={c.plan === "GRATIS" ? "outline" : "default"}>{PLANS[c.plan].name}</Badge>
                <span className="hidden text-xs text-muted-foreground sm:inline">{formatRelative(c.createdAt)}</span>
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>
    </>
  );
}
