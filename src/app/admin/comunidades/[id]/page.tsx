import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { PageHeader, StatCard } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { computeEntitlements } from "@/lib/entitlements";
import { formatCents, formatDate, formatDateTime } from "@/lib/format";
import { PLANS } from "@/lib/plans";
import { ROLE_LABELS } from "@/lib/roles";

export const metadata = { title: "Comunidad" };

const EVENT_LABELS: Record<string, string> = {
  TRIAL_STARTED: "Inicio de prueba",
  SUBSCRIBED: "Suscripción",
  PLAN_CHANGED: "Cambio de plan",
  PAYMENT_SUCCEEDED: "Pago cobrado",
  PAYMENT_FAILED: "Pago fallido",
  CANCELED: "Cancelación",
  REFERRAL_CREDIT: "Mes gratis por recomendación",
};

export default async function AdminComunidad({ params }: PageProps<"/admin/comunidades/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const c = await db.comunidad.findUnique({
    where: { id },
    include: {
      members: { where: { status: { in: ["ACTIVE", "PENDING"] } }, include: { unit: true, user: { select: { email: true, phone: true } } }, orderBy: { joinedAt: "asc" } },
      billingEvents: { orderBy: { occurredAt: "desc" }, take: 50 },
      _count: { select: { announcements: true, incidencias: true, documents: true, juntas: true, cuotas: true } },
    },
  });
  if (!c) notFound();
  const e = computeEntitlements(c);
  const [lastAnnouncement, openIncidencias, collected] = await Promise.all([
    db.announcement.findFirst({ where: { comunidadId: id }, orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
    db.incidencia.count({ where: { comunidadId: id, status: { not: "RESOLVED" } } }),
    db.billingEvent.aggregate({ where: { comunidadId: id, type: "PAYMENT_SUCCEEDED" }, _sum: { amountCents: true } }),
  ]);
  const stripeBase = "https://dashboard.stripe.com";

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
        <Link href="/admin/comunidades"><ArrowLeft /> Comunidades</Link>
      </Button>
      <PageHeader
        title={c.name}
        description={`${c.address}${c.city ? `, ${c.city}` : ""}${c.cif ? ` · CIF ${c.cif}` : ""} · alta ${formatDate(c.createdAt)}`}
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="viviendas" value={c.unitsCount} />
        <StatCard label="vecinos" value={c.members.filter((m) => m.status === "ACTIVE").length} />
        <StatCard label="anuncios" value={c._count.announcements} hint={lastAnnouncement ? `último ${formatDate(lastAnnouncement.createdAt, { month: "short" })}` : undefined} />
        <StatCard label="incidencias abiertas" value={openIncidencias} hint={`${c._count.incidencias} en total`} />
        <StatCard label="juntas" value={c._count.juntas} />
        <StatCard label="documentos" value={c._count.documents} />
        <StatCard label="cuotas registradas" value={c._count.cuotas} />
        <StatCard label="facturado" value={formatCents(collected._sum.amountCents ?? 0)} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Suscripción</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Plan: <Badge>{PLANS[c.plan].name}</Badge> · estado {c.subscriptionStatus.toLowerCase()} · efectivo: {PLANS[e.plan].name}</p>
            <p>Prueba: {e.trialActive ? `activa, termina ${formatDate(e.trialEndsAt)}` : `terminó ${formatDate(e.trialEndsAt)}`}</p>
            {e.readOnly && <p className="text-destructive">Solo lectura: supera el límite de {e.unitLimit} viviendas.</p>}
            {c.currentPeriodEnd && <p>Periodo actual hasta {formatDate(c.currentPeriodEnd)}{c.cancelAtPeriodEnd ? " (cancelará)" : ""}</p>}
            {c.stripeCustomerId && (
              <a className="inline-flex items-center gap-1 text-primary hover:underline" href={`${stripeBase}/customers/${c.stripeCustomerId}`} target="_blank" rel="noreferrer">
                Cliente en Stripe <ExternalLink className="size-3.5" />
              </a>
            )}
            {c.billingEvents.length > 0 && (
              <ol className="mt-3 space-y-1 border-l pl-3">
                {c.billingEvents.map((ev) => (
                  <li key={ev.id} className="text-xs">
                    <span className="font-medium">{EVENT_LABELS[ev.type]}</span>
                    {ev.plan ? ` · ${PLANS[ev.plan].name}` : ""}
                    {ev.amountCents ? ` · ${formatCents(ev.amountCents)}` : ""}
                    <span className="text-muted-foreground"> · {formatDateTime(ev.occurredAt)}</span>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Miembros</CardTitle></CardHeader>
          <CardContent className="divide-y text-sm">
            {c.members.map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-2 py-2">
                <div className="min-w-0">
                  <p className="truncate font-medium">{m.displayName} {m.unit && <span className="font-mono text-xs text-muted-foreground">{m.unit.label}</span>}</p>
                  <p className="truncate text-xs text-muted-foreground">{m.user.email ?? m.user.phone ?? "—"}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  {m.role !== "VECINO" && <Badge variant="secondary">{ROLE_LABELS[m.role]}</Badge>}
                  {m.status === "PENDING" && <Badge variant="outline">Pendiente</Badge>}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
