import "server-only";
import type Stripe from "stripe";
import type { BillingEventType, Plan } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { escapeHtml } from "@/lib/email";
import { notifyMembers } from "@/lib/notifications";
import { PLANS } from "@/lib/plans";
import { getStripe, mapSubscriptionStatus, mrrFor, planForPriceId, subscriptionPeriodEnd } from "@/lib/stripe";
import { appUrl } from "@/lib/urls";

async function comunidadIdFor(sub: Stripe.Subscription) {
  if (sub.metadata?.comunidadId) return sub.metadata.comunidadId;
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const c = await db.comunidad.findFirst({
    where: { OR: [{ stripeSubscriptionId: sub.id }, { stripeCustomerId: customerId }] },
    select: { id: true },
  });
  return c?.id ?? null;
}

/**
 * Mirror a Stripe subscription onto the comunidad and log lifecycle events for analytics.
 */
export async function syncSubscription(sub: Stripe.Subscription, stripeEventId: string, opts: { deleted?: boolean } = {}) {
  const comunidadId = await comunidadIdFor(sub);
  if (!comunidadId) {
    console.warn("[billing] subscription without comunidad", sub.id);
    return;
  }
  const before = await db.comunidad.findUnique({ where: { id: comunidadId } });
  if (!before) return;

  const status = opts.deleted ? "CANCELED" : mapSubscriptionStatus(sub.status);
  const pricedPlan = planForPriceId(sub.items.data[0]?.price?.id) ?? ((sub.metadata?.plan as Plan | undefined) || null);
  const active = status !== "CANCELED";
  const plan: Plan = active && pricedPlan ? pricedPlan : "GRATIS";
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;

  await db.comunidad.update({
    where: { id: comunidadId },
    data: {
      plan,
      subscriptionStatus: status,
      stripeCustomerId: customerId,
      stripeSubscriptionId: active ? sub.id : null,
      currentPeriodEnd: subscriptionPeriodEnd(sub),
      cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end || sub.cancel_at),
    },
  });

  const wasPaid = before.plan !== "GRATIS" && ["ACTIVE", "TRIALING", "PAST_DUE"].includes(before.subscriptionStatus);
  const isPaid = plan !== "GRATIS" && ["ACTIVE", "TRIALING", "PAST_DUE"].includes(status);
  let type: BillingEventType | null = null;
  if (!wasPaid && isPaid) type = "SUBSCRIBED";
  else if (wasPaid && !isPaid) type = "CANCELED";
  else if (wasPaid && isPaid && before.plan !== plan) type = "PLAN_CHANGED";

  if (type) {
    await db.billingEvent.create({
      data: { comunidadId, type, plan: type === "CANCELED" ? before.plan : plan, mrrCents: isPaid ? mrrFor(plan) : 0, stripeEventId },
    });
  }
}

export async function handleCheckoutCompleted(session: Stripe.Checkout.Session, stripeEventId: string) {
  if (session.mode !== "subscription" || !session.subscription) return;
  const subId = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
  const sub = await getStripe().subscriptions.retrieve(subId);
  // Make sure the subscription carries the comunidad id even if metadata was lost.
  if (!sub.metadata?.comunidadId && session.client_reference_id) {
    sub.metadata = { ...sub.metadata, comunidadId: session.client_reference_id };
  }
  await syncSubscription(sub, stripeEventId);
}

function invoiceSubscriptionId(invoice: Stripe.Invoice) {
  const fromParent = invoice.parent?.subscription_details?.subscription;
  if (!fromParent) return null;
  return typeof fromParent === "string" ? fromParent : fromParent.id;
}

export async function handleInvoicePaymentFailed(invoice: Stripe.Invoice, stripeEventId: string) {
  const subId = invoiceSubscriptionId(invoice);
  const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
  const comunidad = await db.comunidad.findFirst({
    where: { OR: [...(subId ? [{ stripeSubscriptionId: subId }] : []), ...(customerId ? [{ stripeCustomerId: customerId }] : [])] },
  });
  if (!comunidad) return;

  await db.$transaction([
    db.comunidad.update({ where: { id: comunidad.id }, data: { subscriptionStatus: "PAST_DUE" } }),
    db.billingEvent.create({
      data: {
        comunidadId: comunidad.id,
        type: "PAYMENT_FAILED",
        plan: comunidad.plan,
        mrrCents: mrrFor(comunidad.plan),
        amountCents: invoice.amount_due,
        stripeEventId,
      },
    }),
  ]);

  await notifyMembers({
    comunidadId: comunidad.id,
    event: "announcement",
    roles: ["PRESIDENT"],
    subject: `No hemos podido cobrar la suscripción de ${comunidad.name}`,
    title: "Problema con el pago",
    html: `<p>El cobro de la suscripción al plan ${escapeHtml(PLANS[comunidad.plan].name)} de <strong>${escapeHtml(comunidad.name)}</strong> ha fallado. Stripe lo reintentará en los próximos días.</p><p>Actualiza el método de pago para no perder las funciones de pago.</p>`,
    text: `El cobro de la suscripción de ${comunidad.name} ha fallado. Actualiza el método de pago.`,
    cta: { label: "Actualizar método de pago", href: appUrl(`/c/${comunidad.id}/plan`) },
  });
}

export async function handleInvoicePaid(invoice: Stripe.Invoice, stripeEventId: string) {
  const subId = invoiceSubscriptionId(invoice);
  if (!subId || invoice.amount_paid <= 0) return;
  const comunidad = await db.comunidad.findFirst({ where: { stripeSubscriptionId: subId } });
  if (!comunidad) return;
  await db.billingEvent.create({
    data: {
      comunidadId: comunidad.id,
      type: "PAYMENT_SUCCEEDED",
      plan: comunidad.plan,
      mrrCents: mrrFor(comunidad.plan),
      amountCents: invoice.amount_paid,
      stripeEventId,
    },
  });
}
