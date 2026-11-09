import Link from "next/link";
import { PageHeader, StatCard } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { trialEndFor } from "@/lib/entitlements";
import { formatCents, formatDate } from "@/lib/format";
import { PLANS } from "@/lib/plans";

export const metadata = { title: "Recomendaciones" };

const pct = (n: number) => `${(n * 100).toFixed(1).replace(".", ",")} %`;

export default async function AdminReferralsPage() {
  await requireAdmin();
  const now = new Date();
  const [referred, withCode, credits] = await Promise.all([
    db.comunidad.findMany({
      where: { referredById: { not: null } },
      include: { referredBy: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    db.comunidad.count({ where: { referralCode: { not: null } } }),
    db.billingEvent.aggregate({ where: { type: "REFERRAL_CREDIT" }, _sum: { amountCents: true } }),
  ]);
  const converted = referred.filter((r) => r.referralConvertedAt);
  // Conversion rate over referrals whose trial has already ended (fair comparison).
  const decided = referred.filter((r) => trialEndFor(r) <= now || r.referralConvertedAt);
  const rate = decided.length ? converted.length / decided.length : 0;

  const byReferrer = new Map<string, { id: string; name: string; total: number; converted: number }>();
  for (const r of referred) {
    if (!r.referredBy) continue;
    const row = byReferrer.get(r.referredBy.id) ?? { ...r.referredBy, total: 0, converted: 0 };
    row.total++;
    if (r.referralConvertedAt) row.converted++;
    byReferrer.set(row.id, row);
  }
  const top = [...byReferrer.values()].sort((a, b) => b.converted - a.converted || b.total - a.total).slice(0, 10);

  return (
    <>
      <PageHeader title="Recomendaciones" description="Programa de referidos: un mes gratis por cada comunidad recomendada que contrata." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="comunidades referidas" value={referred.length} hint={`${withCode} comunidades han generado código`} />
        <StatCard label="han contratado" value={converted.length} />
        <StatCard label="conversión" value={decided.length ? pct(rate) : "—"} hint={`sobre ${decided.length} con prueba terminada`} />
        <StatCard label="meses regalados" value={formatCents(credits._sum.amountCents ?? 0)} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_2fr]">
        <Card>
          <CardHeader><CardTitle>Mejores embajadores</CardTitle></CardHeader>
          <CardContent className="divide-y text-sm">
            {top.length === 0 && <p className="text-muted-foreground">Aún no hay recomendaciones.</p>}
            {top.map((t) => (
              <div key={t.id} className="flex justify-between gap-2 py-2">
                <Link href={`/admin/comunidades/${t.id}`} className="truncate hover:text-primary">{t.name}</Link>
                <span className="shrink-0 text-muted-foreground">{t.converted}/{t.total}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Comunidades referidas</CardTitle><CardDescription>Más recientes primero</CardDescription></CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr><th className="py-2">Comunidad</th><th>Recomendada por</th><th>Alta</th><th>Estado</th></tr>
              </thead>
              <tbody className="divide-y">
                {referred.map((r) => (
                  <tr key={r.id}>
                    <td className="py-2"><Link href={`/admin/comunidades/${r.id}`} className="font-medium hover:text-primary">{r.name}</Link></td>
                    <td>{r.referredBy ? <Link href={`/admin/comunidades/${r.referredBy.id}`} className="hover:text-primary">{r.referredBy.name}</Link> : "—"}</td>
                    <td className="text-xs text-muted-foreground">{formatDate(r.createdAt, { month: "short" })}</td>
                    <td>
                      {r.referralConvertedAt ? (
                        <Badge className="bg-success text-success-foreground">{PLANS[r.plan].name} · {formatDate(r.referralConvertedAt, { month: "short" })}</Badge>
                      ) : trialEndFor(r) > now ? (
                        <Badge variant="secondary">En prueba</Badge>
                      ) : (
                        <Badge variant="outline">Sin convertir</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
