import "server-only";
import Stripe from "stripe";
import type { Plan, SubscriptionStatus } from "@/generated/prisma/enums";
import { PLANS, type PlanId } from "@/lib/plans";

let client: Stripe | null = null;

export function stripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is not set");
  client ??= new Stripe(process.env.STRIPE_SECRET_KEY, {
    appInfo: { name: "Mi Comunidad" },
  });
  return client;
}

type PaidPlan = Exclude<PlanId, "GRATIS">;

const PRICE_ENV: Record<PaidPlan, string> = {
  COMUNIDAD: "STRIPE_PRICE_COMUNIDAD",
  PRO: "STRIPE_PRICE_PRO",
  ADMINISTRADOR: "STRIPE_PRICE_ADMINISTRADOR",
};

export function priceIdFor(plan: PaidPlan) {
  return process.env[PRICE_ENV[plan]] ?? null;
}

export function planForPriceId(priceId: string | null | undefined): Plan | null {
  if (!priceId) return null;
  for (const plan of Object.keys(PRICE_ENV) as PaidPlan[]) {
    if (priceIdFor(plan) === priceId) return plan;
  }
  return null;
}

export function mapSubscriptionStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  switch (status) {
    case "active":
      return "ACTIVE";
    case "trialing":
      return "TRIALING";
    case "past_due":
      return "PAST_DUE";
    case "unpaid":
      return "UNPAID";
    case "incomplete":
    case "paused":
      return "INCOMPLETE";
    case "canceled":
    case "incomplete_expired":
    default:
      return "CANCELED";
  }
}

/** Monthly recurring revenue for a plan, in cents. */
export function mrrFor(plan: Plan | null | undefined) {
  return plan ? PLANS[plan].priceCents : 0;
}

/** API 2025+: the billing period lives on subscription items. */
export function subscriptionPeriodEnd(sub: Stripe.Subscription) {
  const ends = sub.items.data.map((i) => i.current_period_end).filter(Boolean);
  return ends.length ? new Date(Math.max(...ends) * 1000) : null;
}
