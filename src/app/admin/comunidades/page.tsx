import Link from "next/link";
import type { Plan } from "@/generated/prisma/enums";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { computeEntitlements } from "@/lib/entitlements";
import { formatDate } from "@/lib/format";
import { PLAN_ORDER, PLANS } from "@/lib/plans";
import { cn } from "@/lib/utils";

export const metadata = { title: "Comunidades" };

const STATUS: Record<string, string> = {
  NONE: "—", ACTIVE: "Activa", TRIALING: "Prueba Stripe", PAST_DUE: "Impago", UNPAID: "Impagada", INCOMPLETE: "Incompleta", CANCELED: "Cancelada",
};

export default async function AdminComunidades({ searchParams }: PageProps<"/admin/comunidades">) {
  await requireAdmin();
  const { q, plan } = await searchParams;
  const query = typeof q === "string" ? q.trim() : "";
  const planFilter = typeof plan === "string" && plan in PLANS ? (plan as Plan) : undefined;

  const comunidades = await db.comunidad.findMany({
    where: {
      ...(planFilter ? { plan: planFilter } : {}),
      ...(query
        ? { OR: [{ name: { contains: query, mode: "insensitive" } }, { address: { contains: query, mode: "insensitive" } }, { city: { contains: query, mode: "insensitive" } }, { cif: { contains: query, mode: "insensitive" } }] }
        : {}),
    },
    include: { _count: { select: { members: { where: { status: "ACTIVE" } } } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <>
      <PageHeader title="Comunidades" description={`${comunidades.length} resultados`} />
      <form className="mb-4 flex flex-col gap-2 sm:flex-row">
        <Input name="q" defaultValue={query} placeholder="Buscar por nombre, dirección, ciudad o CIF" />
        {planFilter && <input type="hidden" name="plan" value={planFilter} />}
        <Button type="submit" variant="secondary">Buscar</Button>
      </form>
      <div className="mb-4 flex flex-wrap gap-2">
        <Link href="/admin/comunidades" className={cn("rounded-full border px-3 py-1 text-sm", !planFilter ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted")}>Todos</Link>
        {PLAN_ORDER.map((p) => (
          <Link key={p} href={`/admin/comunidades?plan=${p}`} className={cn("rounded-full border px-3 py-1 text-sm", planFilter === p ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted")}>
            {PLANS[p].name}
          </Link>
        ))}
      </div>
      <Card>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr><th className="py-2">Comunidad</th><th>Plan</th><th>Estado</th><th className="text-right">Viviendas</th><th className="text-right">Vecinos</th><th className="text-right">Alta</th></tr>
            </thead>
            <tbody className="divide-y">
              {comunidades.map((c) => {
                const e = computeEntitlements(c);
                return (
                  <tr key={c.id} className="hover:bg-muted/50">
                    <td className="py-2.5">
                      <Link href={`/admin/comunidades/${c.id}`} className="font-medium hover:text-primary">{c.name}</Link>
                      <p className="text-xs text-muted-foreground">{c.city ?? c.address}</p>
                    </td>
                    <td><Badge variant={c.plan === "GRATIS" ? "outline" : "default"}>{PLANS[c.plan].name}</Badge></td>
                    <td className="text-xs">
                      {e.trialActive ? <Badge variant="secondary">Prueba · {e.trialDaysLeft} d</Badge> : e.readOnly ? <Badge variant="destructive">Solo lectura</Badge> : STATUS[c.subscriptionStatus]}
                    </td>
                    <td className="text-right">{c.unitsCount}</td>
                    <td className="text-right">{c._count.members}</td>
                    <td className="text-right text-xs text-muted-foreground">{formatDate(c.createdAt, { month: "short" })}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </>
  );
}
