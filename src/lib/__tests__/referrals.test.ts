import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateReferralCode, normalizeReferralCode } from "../referral-code";

vi.mock("server-only", () => ({}));
const findUnique = vi.fn();
const count = vi.fn();
vi.mock("@/lib/db", () => ({ db: { comunidad: { findUnique: (...a: unknown[]) => findUnique(...a) }, comunidadMember: { count: (...a: unknown[]) => count(...a) } } }));
vi.mock("@/lib/notifications", () => ({ notifyMembers: vi.fn() }));
vi.mock("@/lib/stripe", () => ({ getStripe: vi.fn(), stripeConfigured: () => false }));

describe("referral codes", () => {
  it("generates MC-XXXX codes", () => {
    for (let i = 0; i < 50; i++) expect(generateReferralCode()).toMatch(/^MC-[2-9A-HJKMNP-Z]{4}$/);
  });
  it("normalizes user input", () => {
    expect(normalizeReferralCode(" mc-ab3k ")).toBe("MC-AB3K");
    expect(normalizeReferralCode("MCAB3K")).toBe("MC-AB3K");
    expect(normalizeReferralCode("MC-AB1K")).toBeNull(); // ambiguous char
    expect(normalizeReferralCode("XX-AB3K")).toBeNull();
    expect(normalizeReferralCode("MC-AB3KZ")).toBeNull();
    expect(normalizeReferralCode(undefined)).toBeNull();
  });
});

describe("resolveReferrer", () => {
  beforeEach(() => {
    findUnique.mockReset();
    count.mockReset().mockResolvedValue(0);
  });

  it("ignores invalid codes without querying", async () => {
    const { resolveReferrer } = await import("../referrals");
    expect(await resolveReferrer("nope")).toBeNull();
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("returns the referrer", async () => {
    findUnique.mockResolvedValue({ id: "ref1", name: "C. P. Uno" });
    const { resolveReferrer } = await import("../referrals");
    expect(await resolveReferrer("mc-ab3k", { comunidadId: "other" })).toEqual({ id: "ref1", name: "C. P. Uno" });
  });

  it("silently rejects self-referral", async () => {
    findUnique.mockResolvedValue({ id: "same", name: "C. P. Uno" });
    const { resolveReferrer } = await import("../referrals");
    expect(await resolveReferrer("MC-AB3K", { comunidadId: "same" })).toBeNull();
    count.mockResolvedValue(1);
    expect(await resolveReferrer("MC-AB3K", { userId: "u1" })).toBeNull();
  });

  it("returns null for unknown codes", async () => {
    findUnique.mockResolvedValue(null);
    const { resolveReferrer } = await import("../referrals");
    expect(await resolveReferrer("MC-AB3K")).toBeNull();
  });
});
