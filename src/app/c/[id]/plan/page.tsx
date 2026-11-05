import type { Metadata } from "next";
import { AlertTriangle, Check, CreditCard, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { getEntitlements, requireMember } from "@/lib/auth";
import { FEATURE_LABELS } from "@/lib/entitlements";
import { formatCents, formatDate } from "@/lib/format";
import { PLAN_ORDER, PLANS, type PlanFeature } from "@/lib/plans";
import { cn } from "@/lib/utils";
import { openBillingPortal, startCheckout } from "./actions";

export const metadata: Metadata = { title: "Plan y facturación" };

const ERRORS: Record<string, string> = {
  stripe: "Los pagos no están disponibles en este momento. Inténtalo más tarde.",
  precio: "Este plan no está disponible todavía.",
  unidades: "Tu comunidad tiene más viviendas de las que permite ese plan.",
  suscrito: "Ya tienes una suscripción activa: cambia de plan desde «Gestionar suscripción».",
};

const STATUS: Record<string, string> = {
  ACTIVE: "Activa",
  TRIALING: "En prueba",
  PAST_DUE: "Pago pendiente",
  UNPAID: "Impagada",
  INCOMPLETE: "Incompleta",
  CANCELED: "Cancelada",
  NONE: "Sin suscripción",
};

export default async function PlanPage({ params, searchParams }: PageProps<"/c/[id]/plan">) {
  const { id } = await params;
  const { motivo, error, checkout } = await searchParams;
  const { member, comunidad } = await requireMember(id);
  const e = await getEntitlements(comunidad);
  const president = member.role === "PRESIDENT";
  const subscribed = Boolean(comunidad.stripeSubscriptionId) && comunidad.subscriptionStatus !== "CANCELED";

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Plan y facturación" description={`${comunidad.unitsCount} viviendas · Plan actual: ${PLANS[e.plan].name}`} />

      {checkout === "ok" && (
        <Alert className="mb-4 border-success">
          <Check />
          <AlertTitle>¡Gracias! Tu suscripción se está activando.</AlertTitle>
          <AlertDescription>En unos segundos verás el nuevo plan reflejado aquí.</AlertDescription>
        </Alert>
      )}
      {typeof error === "string" && ERRORS[error] && (
        <Alert variant="destructive" className="mb-4"><AlertDescription>{ERRORS[error]}</AlertDescription></Alert>
      )}
      {motivo === "limite" && (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle />
          <AlertTitle>Tu comunidad está en modo solo lectura</AlertTitle>
          <AlertDescription>
            Tiene {comunidad.unitsCount} viviendas y el plan {PLANS[e.plan].name} permite {e.unitLimit}. Elige un plan para seguir publicando.
          </AlertDescription>
        </Alert>
      )}
      {typeof motivo === "string" && motivo in FEATURE_LABELS && (
        <Alert className="mb-4 border-warning">
          <Sparkles />
          <AlertTitle>{FEATURE_LABELS[motivo as PlanFeature]} está incluido en el plan Comunidad</AlertTitle>
          <AlertDescription>Mejora tu plan para usar esta función.</AlertDescription>
        </Alert>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            {PLANS[e.plan].name}
            {e.trialActive && <Badge>Prueba gratuita · {e.trialDaysLeft} días</Badge>}
            {e.adminCovered && <Badge variant="secondary">Incluido en tu plan Administrador</Badge>}
            {subscribed && <Badge variant={e.pastDue ? "destructive" : "secondary"}>{STATUS[comunidad.subscriptionStatus]}</Badge>}
          </CardTitle>
          <CardDescription>
            {e.trialActive
              ? `Disfrutas de todas las funciones del plan Comunidad hasta el ${formatDate(e.trialEndsAt)}. Después pasarás al plan Gratis${comunidad.unitsCount > 10 ? " en modo solo lectura (tu comunidad tiene más de 10 viviendas)" : ""}.`
              : subscribed && comunidad.currentPeriodEnd
                ? comunidad.cancelAtPeriodEnd
                  ? `Tu suscripción finaliza el ${formatDate(comunidad.currentPeriodEnd)}.`
                  : `Próxima renovación: ${formatDate(comunidad.currentPeriodEnd)}.`
                : "Sin suscripción de pago."}
          </CardDescription>
        </CardHeader>
        {e.pastDue && (
          <CardContent>
            <Alert variant="destructive"><AlertDescription>No hemos podido cobrar la última factura. Actualiza el método de pago para no perder las funciones de pago.</AlertDescription></Alert>
          </CardContent>
        )}
        {president && comunidad.stripeCustomerId && (
          <CardFooter>
            <form action={openBillingPortal}>
              <input type="hidden" name="comunidadId" value={id} />
              <Button variant="outline"><CreditCard /> Gestionar suscripción y facturas</Button>
            </form>
          </CardFooter>
        )}
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PLAN_ORDER.map((planId) => {
          const plan = PLANS[planId];
          const current = (subscribed && comunidad.plan === planId) || (!subscribed && !e.trialActive && planId === e.plan);
          const tooSmall = plan.maxUnits !== null && comunidad.unitsCount > plan.maxUnits;
          return (
            <Card key={planId} className={cn("flex flex-col", current && "border-primary ring-2 ring-primary/30")}>
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>{plan.tagline}</CardDescription>
                <p className="pt-1">
                  <span className="font-heading text-3xl font-semibold">{formatCents(plan.priceCents, { round: true })}</span>
                  <span className="text-muted-foreground"> /mes + IVA</span>
                </p>
              </CardHeader>
              <CardContent className="flex-1">
                <ul className="space-y-1.5 text-sm">
                  {plan.highlights.map((h) => (
                    <li key={h} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-success" /> {h}</li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                {current ? (
                  <Button disabled variant="outline" className="w-full">Plan actual</Button>
                ) : planId === "GRATIS" ? (
                  <p className="text-xs text-muted-foreground">{tooSmall ? `Solo hasta ${plan.maxUnits} viviendas` : "Siempre disponible"}</p>
                ) : !president ? (
                  <p className="text-xs text-muted-foreground">Solo el presidente puede contratar.</p>
                ) : tooSmall ? (
                  <p className="text-xs text-muted-foreground">Máximo {plan.maxUnits} viviendas</p>
                ) : subscribed ? (
                  <form action={openBillingPortal} className="w-full">
                    <input type="hidden" name="comunidadId" value={id} />
                    <Button variant="outline" className="w-full">Cambiar a {plan.name}</Button>
                  </form>
                ) : (
                  <form action={startCheckout} className="w-full">
                    <input type="hidden" name="comunidadId" value={id} />
                    <input type="hidden" name="plan" value={planId} />
                    <Button className="w-full">Contratar {plan.name}</Button>
                  </form>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        Pagos seguros con Stripe. Factura con IVA a nombre de la comunidad (CIF). Puedes cancelar cuando quieras desde «Gestionar suscripción».
      </p>
    </div>
  );
}
