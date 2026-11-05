import { describe, expect, it } from "vitest";
import { computeEntitlements, hasFeature } from "../entitlements";

const now = new Date("2026-06-20T00:00:00Z");
const base = { plan: "GRATIS" as const, subscriptionStatus: "NONE", trialEndsAt: null, createdAt: new Date("2026-06-10T00:00:00Z"), unitsCount: 18 };

describe("computeEntitlements", () => {
  it("gives Comunidad features during the 14-day trial, without unit limit", () => {
    const e = computeEntitlements(base, { now });
    expect(e.trialActive).toBe(true);
    expect(e.plan).toBe("COMUNIDAD");
    expect(e.trialDaysLeft).toBe(4);
    expect(e.overLimit).toBe(false);
    expect(hasFeature(e, "voting")).toBe(true);
  });

  it("falls back to Gratis after the trial and becomes read-only over 10 units", () => {
    const e = computeEntitlements({ ...base, createdAt: new Date("2026-05-01T00:00:00Z") }, { now });
    expect(e.trialActive).toBe(false);
    expect(e.plan).toBe("GRATIS");
    expect(e.overLimit).toBe(true);
    expect(e.readOnly).toBe(true);
    expect(hasFeature(e, "announcements")).toBe(false);
  });

  it("small comunidades keep Gratis features after the trial", () => {
    const e = computeEntitlements({ ...base, unitsCount: 8, createdAt: new Date("2026-05-01T00:00:00Z") }, { now });
    expect(e.readOnly).toBe(false);
    expect(hasFeature(e, "announcements")).toBe(true);
    expect(hasFeature(e, "cuotas")).toBe(false);
  });

  it("uses the paid plan while active or past due", () => {
    expect(computeEntitlements({ ...base, plan: "PRO", subscriptionStatus: "ACTIVE" }, { now }).plan).toBe("PRO");
    const pastDue = computeEntitlements({ ...base, plan: "COMUNIDAD", subscriptionStatus: "PAST_DUE" }, { now });
    expect(pastDue.plan).toBe("COMUNIDAD");
    expect(pastDue.pastDue).toBe(true);
  });

  it("ignores canceled subscriptions", () => {
    const e = computeEntitlements({ ...base, plan: "COMUNIDAD", subscriptionStatus: "CANCELED", createdAt: new Date("2026-01-01") }, { now });
    expect(e.plan).toBe("GRATIS");
  });

  it("enforces the plan unit limit", () => {
    expect(computeEntitlements({ ...base, plan: "COMUNIDAD", subscriptionStatus: "ACTIVE", unitsCount: 51 }, { now }).overLimit).toBe(true);
  });

  it("Administrador coverage gives unlimited units", () => {
    const e = computeEntitlements({ ...base, unitsCount: 500, createdAt: new Date("2026-01-01") }, { now, adminCovered: true });
    expect(e.plan).toBe("ADMINISTRADOR");
    expect(e.overLimit).toBe(false);
  });
});
