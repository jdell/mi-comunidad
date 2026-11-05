import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { escapeHtml } from "@/lib/email";
import { formatCents } from "@/lib/format";
import { notifyMembers } from "@/lib/notifications";
import { PLANS } from "@/lib/plans";
import { generateReferralCode, normalizeReferralCode } from "@/lib/referral-code";
import { getStripe, stripeConfigured } from "@/lib/stripe";
import { appUrl } from "@/lib/urls";

export function referralLink(code: string) {
  return appUrl(`/?ref=${code}`);
}

/** Returns the comunidad's referral code, generating it on first use. */
export async function getOrCreateReferralCode(comunidadId: string): Promise<string> {
  const existing = await db.comunidad.findUnique({ where: { id: comunidadId }, select: { referralCode: true } });
  if (existing?.referralCode) return existing.referralCode;
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = generateReferralCode();
    try {
      const res = await db.comunidad.updateMany({ where: { id: comunidadId, referralCode: null }, data: { referralCode: code } });
      if (res.count === 1) return code;
      // Someone else generated it concurrently.
      const now = await db.comunidad.findUnique({ where: { id: comunidadId }, select: { referralCode: true } });
      if (now?.referralCode) return now.referralCode;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") continue; // collision, retry
      throw err;
    }
  }
  throw new Error("Could not generate a unique referral code");
}

/**
 * Resolve a referral code to the referring comunidad. Returns null for invalid or
 * unknown codes and silently rejects self-referral (same comunidad, or a comunidad
 * the registering user already presides).
 */
export async function resolveReferrer(
  code: string | null | undefined,
  opts: { comunidadId?: string; userId?: string } = {},
): Promise<{ id: string; name: string } | null> {
  const normalized = normalizeReferralCode(code);
  if (!normalized) return null;
  const referrer = await db.comunidad.findUnique({ where: { referralCode: normalized }, select: { id: true, name: true } });
  if (!referrer) return null;
  if (opts.comunidadId && referrer.id === opts.comunidadId) return null;
  if (opts.userId) {
    const ownsReferrer = await db.comunidadMember.count({
      where: { comunidadId: referrer.id, userId: opts.userId, role: "PRESIDENT", status: "ACTIVE" },
    });
    if (ownsReferrer) return null;
  }
  return referrer;
}

/** Reward for a successful referral: one month of the referrer's plan (Comunidad if they are not paying). */
export function referralRewardCents(referrer: { plan: keyof typeof PLANS }) {
  return referrer.plan === "GRATIS" ? PLANS.COMUNIDAD.priceCents : PLANS[referrer.plan].priceCents;
}

async function applyStripeCredit(customerId: string, cents: number, description: string) {
  await getStripe().customers.createBalanceTransaction(customerId, { amount: -cents, currency: "eur", description });
}

/**
 * Called when a comunidad first subscribes. Stamps the conversion once and grants the
 * referrer one free month as Stripe customer credit (or keeps it pending until they have
 * a Stripe customer). Never throws.
 */
export async function handleReferralConversion(comunidadId: string, stripeEventId?: string) {
  try {
    const stamped = await db.comunidad.updateMany({
      where: { id: comunidadId, referredById: { not: null }, referralConvertedAt: null },
      data: { referralConvertedAt: new Date() },
    });
    if (stamped.count !== 1) return;

    const referred = await db.comunidad.findUniqueOrThrow({ where: { id: comunidadId }, include: { referredBy: true } });
    const referrer = referred.referredBy;
    if (!referrer) return;
    const reward = referralRewardCents(referrer);
    const description = `Mes gratis por recomendar a ${referred.name}`;

    let applied = false;
    if (referrer.stripeCustomerId && stripeConfigured()) {
      try {
        await applyStripeCredit(referrer.stripeCustomerId, reward, description);
        applied = true;
      } catch (err) {
        console.error("[referral] stripe credit failed, keeping pending", err);
      }
    }
    await db.$transaction([
      db.comunidad.update({ where: { id: referred.id }, data: { referralRewardCents: reward } }),
      ...(applied ? [] : [db.comunidad.update({ where: { id: referrer.id }, data: { referralCreditPendingCents: { increment: reward } } })]),
      db.billingEvent.create({
        data: { comunidadId: referrer.id, type: "REFERRAL_CREDIT", plan: referrer.plan, amountCents: reward, stripeEventId },
      }),
    ]);

    await notifyMembers({
      comunidadId: referrer.id,
      event: "billing",
      roles: ["PRESIDENT"],
      subject: `🎉 ${referred.name} ha contratado Mi Comunidad: tenéis un mes gratis`,
      title: "¡Gracias por recomendarnos!",
      html: `<p><strong>${escapeHtml(referred.name)}</strong> se ha unido a Mi Comunidad gracias a vuestra recomendación y acaba de contratar un plan.</p><p>Os regalamos <strong>${formatCents(reward)}</strong> (un mes gratis), que se descontará automáticamente de vuestra próxima factura${applied ? "" : " cuando contratéis un plan"}.</p>`,
      text: `${referred.name} ha contratado Mi Comunidad gracias a vuestra recomendación: tenéis ${formatCents(reward)} de crédito.`,
      cta: { label: "Ver mis recomendaciones", href: appUrl(`/c/${referrer.id}/ajustes#recomienda`) },
    });
  } catch (err) {
    console.error("[referral] conversion handling failed", comunidadId, err);
  }
}

/** Apply credit earned before the referrer had a Stripe customer. */
export async function applyPendingReferralCredit(comunidadId: string, customerId: string) {
  const c = await db.comunidad.findUnique({ where: { id: comunidadId }, select: { referralCreditPendingCents: true } });
  if (!c || c.referralCreditPendingCents <= 0 || !stripeConfigured()) return;
  const cents = c.referralCreditPendingCents;
  const res = await db.comunidad.updateMany({
    where: { id: comunidadId, referralCreditPendingCents: cents },
    data: { referralCreditPendingCents: 0 },
  });
  if (res.count !== 1) return;
  try {
    await applyStripeCredit(customerId, cents, "Crédito por recomendaciones de Mi Comunidad");
  } catch (err) {
    await db.comunidad.update({ where: { id: comunidadId }, data: { referralCreditPendingCents: { increment: cents } } });
    console.error("[referral] applying pending credit failed", err);
  }
}

/** Day-21 follow-up to the referrer about each comunidad they referred. */
export async function sendReferralFollowUps(now = new Date()) {
  const DAY = 86_400_000;
  const referred = await db.comunidad.findMany({
    where: {
      referredById: { not: null },
      referralFollowUpSentAt: null,
      createdAt: { lte: new Date(now.getTime() - 21 * DAY), gte: new Date(now.getTime() - 60 * DAY) },
    },
    include: { referredBy: { select: { id: true, name: true } } },
  });
  for (const r of referred) {
    if (!r.referredBy) continue;
    const converted = Boolean(r.referralConvertedAt);
    await notifyMembers({
      comunidadId: r.referredBy.id,
      event: "membership",
      roles: ["PRESIDENT"],
      subject: converted ? `${r.name} ya usa Mi Comunidad gracias a vosotros` : `¿Qué tal le va a ${r.name} con Mi Comunidad?`,
      title: converted ? "Vuestra recomendación ha funcionado" : "Tres semanas desde vuestra recomendación",
      html: converted
        ? `<p>Hace tres semanas recomendasteis Mi Comunidad a <strong>${escapeHtml(r.name)}</strong> y ya tienen un plan contratado. Vuestro mes gratis ya está aplicado.</p><p>¿Conocéis otra comunidad a la que le pueda venir bien? Cada nueva comunidad que contrate os regala otro mes.</p>`
        : `<p>Hace tres semanas <strong>${escapeHtml(r.name)}</strong> se registró en Mi Comunidad con vuestro enlace. Su prueba gratuita ya ha terminado.</p><p>Si se animan a contratar un plan, os regalamos <strong>un mes gratis</strong>. Quizá les ayude que les contéis cómo lo usáis vosotros.</p>`,
      text: converted ? `${r.name} ya tiene plan en Mi Comunidad gracias a vosotros.` : `${r.name} se registró con vuestro enlace hace tres semanas. Si contratan, tenéis un mes gratis.`,
      cta: { label: "Ver mis recomendaciones", href: appUrl(`/c/${r.referredBy.id}/ajustes#recomienda`) },
    });
    await db.comunidad.update({ where: { id: r.id }, data: { referralFollowUpSentAt: now } });
  }
  return referred.length;
}
