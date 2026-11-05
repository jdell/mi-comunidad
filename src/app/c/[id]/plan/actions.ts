"use server";

import { redirect } from "next/navigation";
import { requireMember } from "@/lib/auth";
import { db } from "@/lib/db";
import { PLANS, type PlanId } from "@/lib/plans";
import { applyPendingReferralCredit } from "@/lib/referrals";
import { getStripe, priceIdFor, stripeConfigured } from "@/lib/stripe";
import { appUrl } from "@/lib/urls";

const BILLING_ROLES = ["PRESIDENT" as const];

async function ensureCustomer(comunidadId: string) {
  const comunidad = await db.comunidad.findUniqueOrThrow({ where: { id: comunidadId } });
  if (comunidad.stripeCustomerId) return comunidad.stripeCustomerId;
  const president = await db.comunidadMember.findFirst({
    where: { comunidadId, role: "PRESIDENT", status: "ACTIVE" },
    include: { user: true },
  });
  const customer = await getStripe().customers.create({
    name: `Comunidad de Propietarios ${comunidad.name}`,
    email: president?.email ?? president?.user.email ?? undefined,
    phone: president?.phone ?? president?.user.phone ?? undefined,
    preferred_locales: ["es"],
    address: { line1: comunidad.address, city: comunidad.city ?? undefined, postal_code: comunidad.postalCode ?? undefined, country: "ES" },
    metadata: { comunidadId },
    ...(comunidad.cif ? { tax_id_data: [{ type: "es_cif", value: comunidad.cif }] } : {}),
  });
  await db.comunidad.update({ where: { id: comunidadId }, data: { stripeCustomerId: customer.id } });
  // Referral months earned before having a Stripe customer become customer credit (applied to the first invoice).
  await applyPendingReferralCredit(comunidadId, customer.id);
  return customer.id;
}

export async function startCheckout(formData: FormData) {
  const comunidadId = String(formData.get("comunidadId"));
  const plan = String(formData.get("plan")) as PlanId;
  const { comunidad } = await requireMember(comunidadId, BILLING_ROLES);
  const back = `/c/${comunidadId}/plan`;

  if (!(plan in PLANS) || plan === "GRATIS") redirect(back);
  if (!stripeConfigured()) redirect(`${back}?error=stripe`);
  const priceId = priceIdFor(plan);
  if (!priceId) redirect(`${back}?error=precio`);
  const max = PLANS[plan].maxUnits;
  if (max !== null && comunidad.unitsCount > max) redirect(`${back}?error=unidades`);

  // Already subscribed: plan changes go through the billing portal.
  if (comunidad.stripeSubscriptionId && comunidad.subscriptionStatus !== "CANCELED") {
    redirect(`${back}?error=suscrito`);
  }

  const customer = await ensureCustomer(comunidadId);
  const session = await getStripe().checkout.sessions.create({
    mode: "subscription",
    customer,
    client_reference_id: comunidadId,
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: { metadata: { comunidadId, plan } },
    metadata: { comunidadId, plan },
    locale: "es",
    allow_promotion_codes: true,
    billing_address_collection: "required",
    tax_id_collection: { enabled: true },
    customer_update: { address: "auto", name: "auto" },
    ...(process.env.STRIPE_AUTOMATIC_TAX === "true" ? { automatic_tax: { enabled: true } } : {}),
    success_url: appUrl(`${back}?checkout=ok`),
    cancel_url: appUrl(`${back}?checkout=cancelado`),
  });
  redirect(session.url!);
}

export async function openBillingPortal(formData: FormData) {
  const comunidadId = String(formData.get("comunidadId"));
  const { comunidad } = await requireMember(comunidadId, BILLING_ROLES);
  if (!stripeConfigured() || !comunidad.stripeCustomerId) redirect(`/c/${comunidadId}/plan?error=stripe`);
  const session = await getStripe().billingPortal.sessions.create({
    customer: comunidad.stripeCustomerId,
    locale: "es",
    return_url: appUrl(`/c/${comunidadId}/plan`),
  });
  redirect(session.url);
}
