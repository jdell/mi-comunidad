import { describe, expect, it } from "vitest";
import { churnRate, lastMonths, mrrTrend, type EventRow } from "../revenue";

const ev = (comunidadId: string, type: string, mrrCents: number, iso: string): EventRow => ({
  comunidadId,
  type,
  plan: null,
  mrrCents,
  occurredAt: new Date(iso),
});

describe("revenue", () => {
  const events = [
    ev("a", "SUBSCRIBED", 900, "2026-01-15"),
    ev("b", "SUBSCRIBED", 1900, "2026-02-03"),
    ev("a", "PLAN_CHANGED", 1900, "2026-03-10"),
    ev("b", "PAYMENT_FAILED", 1900, "2026-03-11"),
    ev("b", "CANCELED", 0, "2026-04-20"),
  ];

  it("lists months oldest first", () => {
    expect(lastMonths(3, new Date("2026-04-10T00:00:00Z"))).toEqual(["2026-02", "2026-03", "2026-04"]);
  });

  it("replays MRR per month", () => {
    const trend = mrrTrend(events, ["2026-01", "2026-02", "2026-03", "2026-04"]);
    expect(trend.map((t) => t.mrrCents)).toEqual([900, 2800, 3800, 1900]);
  });

  it("computes logo churn", () => {
    const c = churnRate(events, new Date("2026-04-01"), new Date("2026-05-01"));
    expect(c.payingAtStart).toBe(2);
    expect(c.canceled).toBe(1);
    expect(c.rate).toBe(0.5);
  });
});
