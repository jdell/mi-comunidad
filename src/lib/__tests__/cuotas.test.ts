import { describe, expect, it } from "vitest";
import { addMonths, displayStatus, monthlyCuotas, periodLabel, splitByCoefficient, splitInstallments } from "../cuotas";
import { formatCents, parseEurosToCents } from "../format";

describe("splitByCoefficient", () => {
  it("always sums to the total", () => {
    const units = [{ coefficient: 33.3333 }, { coefficient: 33.3333 }, { coefficient: 33.3334 }];
    const parts = splitByCoefficient(1000, units);
    expect(parts.reduce((a, p) => a + p.shareCents, 0)).toBe(1000);
    expect(parts.map((p) => p.shareCents)).toEqual([333, 333, 334]);
  });
  it("is proportional", () => {
    const parts = splitByCoefficient(1_000_000, [{ coefficient: 25 }, { coefficient: 75 }]);
    expect(parts.map((p) => p.shareCents)).toEqual([250_000, 750_000]);
  });
  it("falls back to equal split without coefficients", () => {
    const parts = splitByCoefficient(100, [{ coefficient: 0 }, { coefficient: 0 }, { coefficient: 0 }]);
    expect(parts.reduce((a, p) => a + p.shareCents, 0)).toBe(100);
  });
});

describe("splitInstallments", () => {
  it("distributes the remainder", () => {
    expect(splitInstallments(1000, 3)).toEqual([334, 333, 333]);
  });
});

describe("monthlyCuotas", () => {
  it("uses fixed amounts", () => {
    expect(monthlyCuotas({ cuotaMode: "FIXED", cuotaFixedCents: 9000, cuotaAnnualBudgetCents: 0 }, [{ coefficient: 50 }, { coefficient: 50 }]).map((u) => u.shareCents)).toEqual([9000, 9000]);
  });
  it("splits annual budget by coefficient", () => {
    const r = monthlyCuotas({ cuotaMode: "COEFFICIENT", cuotaFixedCents: 0, cuotaAnnualBudgetCents: 120_000 }, [{ coefficient: 40 }, { coefficient: 60 }]);
    expect(r.map((u) => u.shareCents)).toEqual([4000, 6000]);
  });
});

describe("periods", () => {
  it("adds months across years", () => {
    expect(addMonths("2026-11", 3)).toBe("2027-02");
    expect(addMonths("2026-01", -1)).toBe("2025-12");
  });
  it("labels in Spanish", () => {
    expect(periodLabel("2026-06")).toBe("Junio de 2026");
  });
  it("computes overdue", () => {
    const now = new Date("2026-06-20T00:00:00Z");
    expect(displayStatus({ status: "PENDING", dueDate: new Date("2026-06-10T00:00:00Z") }, now)).toBe("OVERDUE");
    expect(displayStatus({ status: "PENDING", dueDate: new Date("2026-06-30T00:00:00Z") }, now)).toBe("PENDING");
    expect(displayStatus({ status: "PAID", dueDate: new Date("2026-06-10T00:00:00Z") }, now)).toBe("PAID");
  });
});

describe("money", () => {
  it("parses Spanish formats", () => {
    expect(parseEurosToCents("1.240,50")).toBe(124050);
    expect(parseEurosToCents("12,4")).toBe(1240);
    expect(parseEurosToCents("90")).toBe(9000);
    expect(parseEurosToCents("-3")).toBeNull();
  });
  it("formats cents", () => {
    expect(formatCents(124050)).toMatch(/^1\.?240,50\s€$/);
  });
});
