import Link from "next/link";
import { PageHeader, StatCard } from "@/components/app/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { trialEndFor } from "@/lib/entitlements";
import { formatCents } from "@/lib/format";
import { PLAN_ORDER, PLANS } from "@/lib/plans";
import { churnRate, lastMonths, mrrOf, mrrTrend } from "@/lib/revenue";
import { MrrChart } from "./mrr-chart";

export const metadata = { title: "Ingresos" };

const pct = (n: number) => `${(n * 100).toFixed(1).replace(".", ",")} %`;

export default async function RevenuePage() {
  await requireAdmin();
  const now = new Date();
  const [comunidades, events, payments] = await Promise.all([
    db.comunidad.findMany({ select: { id: true, name: true, plan: true, subscriptionStatus: true, trialEndsAt: true, createdAt: true } }),
    db.billingEvent.findMany({ select: { comunidadId: true, type: true, plan: true, mrrCents: true, occurredAt: true }, orderBy: { occurredAt: "asc" } }),
    db.billingEvent.groupBy({
      by: ["comunidadId"],
      where: { type: "PAYMENT_SUCCEEDED" },
      _sum: { amountCents: true },
      orderBy: { _sum: { amountCents: "desc" } },
      take: 10,
    }),
  ]);

  const paying = comunidades.filter((c) => mrrOf(c) > 0);
  const mrr = paying.reduce((a, c) => a + mrrOf(c), 0);
  const arpa = paying.length ? Math.round(mrr / paying.length) : 0;
  const byPlan = PLAN_ORDER.filter((p) => p !== "GRATIS").map((p) => {
    const subs = paying.filter((c) => c.plan === p);
    return { plan: p, count: subs.length, mrr: subs.length * PLANS[p].priceCents };
  });

  const months = lastMonths(12, now);
  const trend = mrrTrend(events, months);
  const prev = trend.at(-2)?.mrrCents ?? 0;
  const growth = prev ? (mrr - prev) / prev : 0;

  const from30 = new Date(now.getTime() - 30 * 86_400_000);
  const churn = churnRate(events, from30, now);
  const churnedMrr = events
    .filter((e) => e.type === "CANCELED" && e.occurredAt >= from30)
    .reduce((acc, e) => {
      const before = events.filter((x) => x.comunidadId === e.comunidadId && x.occurredAt < e.occurredAt && x.mrrCents > 0).at(-1);
      return acc + (before?.mrrCents ?? 0);
    }, 0);

  // Trial conversion: comunidades whose trial has ended and that ever subscribed.
  const subscribedIds = new Set(events.filter((e) => e.type === "SUBSCRIBED").map((e) => e.comunidadId));
  const from90 = new Date(now.getTime() - 90 * 86_400_000);
  const endedTrials = comunidades.filter((c) => trialEndFor(c) <= now);
  const recentEnded = endedTrials.filter((c) => trialEndFor(c) >= from90);
  const conv = (list: typeof comunidades) => ({ total: list.length, converted: list.filter((c) => subscribedIds.has(c.id)).length });
  const conv90 = conv(recentEnded);
  const convAll = conv(endedTrials);

  const names = new Map(comunidades.map((c) => [c.id, c.name]));
  const totalCollected = await db.billingEvent.aggregate({ where: { type: "PAYMENT_SUCCEEDED", occurredAt: { gte: new Date(now.getTime() - 365 * 86_400_000) } }, _sum: { amountCents: true } });

  return (
    <>
      <PageHeader title="Ingresos" description="Métricas de suscripción calculadas a partir del estado de Stripe y el histórico de eventos." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="MRR" value={formatCents(mrr)} hint={prev ? `${growth >= 0 ? "+" : ""}${pct(growth)} vs. mes anterior` : undefined} />
        <StatCard label="ARR" value={formatCents(mrr * 12, { round: true })} />
        <StatCard label="ingreso medio por comunidad (ARPA)" value={formatCents(arpa)} hint={`${paying.length} comunidades de pago`} />
        <StatCard label="churn (30 días)" value={pct(churn.rate)} hint={`${churn.canceled} bajas · −${formatCents(churnedMrr, { round: true })} MRR`} />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Evolución del MRR</CardTitle>
          <CardDescription>Últimos 12 meses</CardDescription>
        </CardHeader>
        <CardContent>
          <MrrChart data={trend} />
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Suscripciones por plan</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {byPlan.map((p) => (
              <div key={p.plan} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{PLANS[p.plan].name}</span>
                  <span className="text-muted-foreground">{p.count} · {formatCents(p.mrr)}/mes</span>
                </div>
                <Progress value={mrr ? (p.mrr / mrr) * 100 : 0} />
              </div>
            ))}
            <p className="text-sm text-muted-foreground">
              Gratis: {comunidades.length - paying.length} comunidades · Cobrado en 12 meses: {formatCents(totalCollected._sum.amountCents ?? 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Conversión de prueba a pago</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="space-y-1">
              <div className="flex justify-between"><span>Últimos 90 días</span><span className="font-medium">{conv90.total ? pct(conv90.converted / conv90.total) : "—"}</span></div>
              <Progress value={conv90.total ? (conv90.converted / conv90.total) * 100 : 0} />
              <p className="text-xs text-muted-foreground">{conv90.converted} de {conv90.total} pruebas terminadas</p>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between"><span>Histórico</span><span className="font-medium">{convAll.total ? pct(convAll.converted / convAll.total) : "—"}</span></div>
              <Progress value={convAll.total ? (convAll.converted / convAll.total) * 100 : 0} />
              <p className="text-xs text-muted-foreground">{convAll.converted} de {convAll.total} pruebas terminadas</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader><CardTitle>Ingresos por comunidad</CardTitle><CardDescription>Top 10 por importe cobrado</CardDescription></CardHeader>
        <CardContent className="divide-y text-sm">
          {payments.length === 0 && <p className="text-muted-foreground">Todavía no hay cobros.</p>}
          {payments.map((p) => (
            <div key={p.comunidadId} className="flex justify-between py-2">
              <Link href={`/admin/comunidades/${p.comunidadId}`} className="hover:text-primary">{names.get(p.comunidadId) ?? p.comunidadId}</Link>
              <span className="font-mono">{formatCents(p._sum.amountCents ?? 0)}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
}
