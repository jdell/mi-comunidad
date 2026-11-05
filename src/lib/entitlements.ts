// Plan entitlements: which plan a comunidad effectively has right now and what it can do.
// Pure function so it can be unit-tested; the DB lookup for Administrador coverage lives in auth.ts.
import { PLANS, type PlanFeature, type PlanId } from "@/lib/plans";

export const TRIAL_DAYS = 14;
const DAY = 86_400_000;

/** Subscription statuses that keep paid features on (past_due = grace period while Stripe retries). */
export const PAID_STATUSES = ["ACTIVE", "TRIALING", "PAST_DUE"] as const;

export interface BillingFields {
  plan: PlanId;
  subscriptionStatus: string;
  trialEndsAt: Date | null;
  createdAt: Date;
  unitsCount: number;
}

export interface Entitlements {
  /** Plan whose features apply now. */
  plan: PlanId;
  paid: boolean;
  trialActive: boolean;
  trialEndsAt: Date;
  trialDaysLeft: number;
  /** Covered by the president's Administrador subscription on another comunidad. */
  adminCovered: boolean;
  unitLimit: number | null;
  /** More units than the effective plan allows: the comunidad becomes read-only. */
  overLimit: boolean;
  readOnly: boolean;
  pastDue: boolean;
  features: PlanFeature[];
}

export function trialEndFor(c: Pick<BillingFields, "trialEndsAt" | "createdAt">) {
  return c.trialEndsAt ?? new Date(c.createdAt.getTime() + TRIAL_DAYS * DAY);
}

export function computeEntitlements(c: BillingFields, opts: { adminCovered?: boolean; now?: Date } = {}): Entitlements {
  const now = opts.now ?? new Date();
  const paid = c.plan !== "GRATIS" && (PAID_STATUSES as readonly string[]).includes(c.subscriptionStatus);
  const trialEndsAt = trialEndFor(c);
  const adminCovered = !paid && Boolean(opts.adminCovered);
  const trialActive = !paid && !adminCovered && trialEndsAt > now;

  const plan: PlanId = paid ? c.plan : adminCovered ? "ADMINISTRADOR" : trialActive ? "COMUNIDAD" : "GRATIS";
  // During the trial the unit limit is not enforced, so large buildings can try the product.
  const unitLimit = trialActive ? null : PLANS[plan].maxUnits;
  const overLimit = unitLimit !== null && c.unitsCount > unitLimit;

  return {
    plan,
    paid,
    trialActive,
    trialEndsAt,
    trialDaysLeft: Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / DAY)),
    adminCovered,
    unitLimit,
    overLimit,
    readOnly: overLimit,
    pastDue: c.subscriptionStatus === "PAST_DUE",
    features: overLimit ? [] : PLANS[plan].features,
  };
}

export function hasFeature(e: Entitlements, feature: PlanFeature) {
  return e.features.includes(feature);
}

export const FEATURE_LABELS: Record<PlanFeature, string> = {
  announcements: "Anuncios",
  incidencias: "Incidencias",
  documents: "Documentos",
  junta_basic: "Convocatoria de juntas",
  cuotas: "Gestión de cuotas",
  reminders: "Recordatorios automáticos",
  voting: "Votaciones en junta",
  actas: "Actas automáticas",
  derramas: "Derramas",
  analytics: "Analíticas",
  branding: "Marca personalizada",
  multi_comunidad: "Panel multi-comunidad",
};
