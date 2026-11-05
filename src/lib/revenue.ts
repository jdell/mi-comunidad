// Revenue analytics from Comunidad billing state and the BillingEvent log. Pure helpers + loader.
import type { Plan } from "@/generated/prisma/enums";
import { PLANS } from "@/lib/plans";

export const ACTIVE_STATUSES = ["ACTIVE", "TRIALING", "PAST_DUE"] as const;

export interface EventRow {
  comunidadId: string;
  type: string;
  plan: Plan | null;
  mrrCents: number;
  occurredAt: Date;
}

/** "YYYY-MM" month keys for the last `n` months, oldest first. */
export function lastMonths(n: number, now = new Date()) {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    out.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

function monthEnd(key: string) {
  const [y, m] = key.split("-").map(Number) as [number, number];
  return new Date(Date.UTC(y, m, 1)); // exclusive
}

const MRR_EVENTS = new Set(["SUBSCRIBED", "PLAN_CHANGED", "CANCELED"]);

/** MRR at the end of each month, replaying subscription lifecycle events. */
export function mrrTrend(events: EventRow[], months: string[]) {
  const sorted = events.filter((e) => MRR_EVENTS.has(e.type)).sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
  return months.map((key) => {
    const end = monthEnd(key);
    const latest = new Map<string, number>();
    for (const e of sorted) {
      if (e.occurredAt >= end) break;
      latest.set(e.comunidadId, e.mrrCents);
    }
    return { month: key, mrrCents: [...latest.values()].reduce((a, b) => a + b, 0) };
  });
}

/** Logo churn over a window: cancellations / paying comunidades at the start of the window. */
export function churnRate(events: EventRow[], from: Date, to: Date) {
  const startMrr = new Map<string, number>();
  for (const e of events.filter((x) => MRR_EVENTS.has(x.type)).sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime())) {
    if (e.occurredAt >= from) break;
    startMrr.set(e.comunidadId, e.mrrCents);
  }
  const payingAtStart = [...startMrr.values()].filter((v) => v > 0).length;
  const canceled = events.filter((e) => e.type === "CANCELED" && e.occurredAt >= from && e.occurredAt < to).length;
  return { payingAtStart, canceled, rate: payingAtStart ? canceled / payingAtStart : 0 };
}

export function mrrOf(c: { plan: Plan; subscriptionStatus: string }) {
  return c.plan !== "GRATIS" && (ACTIVE_STATUSES as readonly string[]).includes(c.subscriptionStatus) ? PLANS[c.plan].priceCents : 0;
}
