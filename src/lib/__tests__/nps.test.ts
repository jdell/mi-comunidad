import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ db: {} }));

describe("npsScore", () => {
  it("is promoters minus detractors", async () => {
    const { npsScore } = await import("../nps");
    expect(npsScore([10, 9, 8, 7, 6, 0])).toBe(0);
    expect(npsScore([10, 10, 9, 5])).toBe(50);
    expect(npsScore([])).toBeNull();
  });
});
