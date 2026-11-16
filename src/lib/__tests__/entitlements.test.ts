import { describe, expect, it } from "vitest";
import { computeEntitlements, effectiveTier, hasFeature } from "../entitlements";
import { courtesyUntil } from "../courtesy-grant";

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

  it("an active courtesy grant unlocks Pro and pauses the trial", () => {
    const e = computeEntitlements({ ...base, proGrantedUntil: new Date("2026-07-20T00:00:00Z") }, { now });
    expect(e.plan).toBe("PRO");
    expect(e.courtesy).toBe(true);
    expect(e.trialActive).toBe(false);
    expect(e.courtesyDaysLeft).toBe(30);
    expect(hasFeature(e, "analytics")).toBe(true);
  });

  it("an expired courtesy grant is ignored (Gratis after the trial)", () => {
    const c = { ...base, createdAt: new Date("2026-01-01"), unitsCount: 8, proGrantedUntil: new Date("2026-06-19T00:00:00Z") };
    expect(effectiveTier(c, { now })).toBe("GRATIS");
    const e = computeEntitlements(c, { now });
    expect(e.courtesy).toBe(false);
    expect(hasFeature(e, "analytics")).toBe(false);
  });

  it("a paid subscription takes precedence over a courtesy grant", () => {
    const c = { ...base, plan: "COMUNIDAD" as const, subscriptionStatus: "ACTIVE", proGrantedUntil: new Date("2026-07-20") };
    expect(effectiveTier(c, { now })).toBe("COMUNIDAD");
    expect(computeEntitlements(c, { now }).courtesy).toBe(false);
  });
});

describe("courtesyUntil", () => {
  it("starts from now when there is no active grant", () => {
    expect(courtesyUntil("1w", null, now).toISOString()).toBe("2026-06-27T00:00:00.000Z");
    expect(courtesyUntil("1m", new Date("2026-01-01"), now).toISOString()).toBe("2026-07-20T00:00:00.000Z");
  });

  it("extends from the current expiry when the grant is still active", () => {
    expect(courtesyUntil("3m", new Date("2026-07-01T00:00:00Z"), now).toISOString()).toBe("2026-10-01T00:00:00.000Z");
  });

  it("clamps month-end overflow", () => {
    expect(courtesyUntil("1m", null, new Date("2026-01-31T10:00:00Z")).toISOString()).toBe("2026-02-28T10:00:00.000Z");
  });
});
