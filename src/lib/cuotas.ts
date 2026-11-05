// Cuota and derrama calculations. Amounts are integer EUR cents.

export type CuotaKindName = "ORDINARIA" | "DERRAMA";

export function cuotaKey(p: { unitId: string; kind: CuotaKindName; period: string; derramaId?: string | null; installment?: number }) {
  return `${p.unitId}:${p.kind}:${p.period}:${p.derramaId ?? "-"}:${p.installment ?? 1}`;
}

/** "2026-06" for a date in Europe/Madrid. */
export function periodOf(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid", year: "numeric", month: "2-digit" }).formatToParts(date);
  const y = parts.find((p) => p.type === "year")!.value;
  const m = parts.find((p) => p.type === "month")!.value;
  return `${y}-${m}`;
}

export function isValidPeriod(period: string) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(period);
}

export function addMonths(period: string, delta: number) {
  const [y, m] = period.split("-").map(Number) as [number, number];
  const idx = y * 12 + (m - 1) + delta;
  return `${Math.floor(idx / 12)}-${String((idx % 12) + 1).padStart(2, "0")}`;
}

export function periodLabel(period: string, style: "long" | "short" = "long") {
  const [y, m] = period.split("-").map(Number) as [number, number];
  const label = new Intl.DateTimeFormat("es-ES", { month: style, year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(y, m - 1, 15)),
  );
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Due date: given day of the period's month at 23:59 Madrid (approx. 21:59/22:59 UTC). */
export function dueDateFor(period: string, dueDay: number) {
  const [y, m] = period.split("-").map(Number) as [number, number];
  return new Date(Date.UTC(y, m - 1, Math.min(Math.max(dueDay, 1), 28), 21, 59));
}

/**
 * Split `totalCents` across units proportionally to their coefficients using the
 * largest-remainder method, so the parts always add up exactly to the total.
 */
export function splitByCoefficient<T extends { coefficient: number }>(totalCents: number, units: T[]): (T & { shareCents: number })[] {
  const coefSum = units.reduce((a, u) => a + u.coefficient, 0);
  if (units.length === 0) return [];
  if (coefSum <= 0) {
    // Fallback: equal split.
    return splitByCoefficient(totalCents, units.map((u) => ({ ...u, coefficient: 1 })));
  }
  const raw = units.map((u, index) => {
    const exact = (totalCents * u.coefficient) / coefSum;
    return { u, index, floor: Math.floor(exact), remainder: exact - Math.floor(exact) };
  });
  let leftover = totalCents - raw.reduce((a, r) => a + r.floor, 0);
  const order = [...raw].sort((a, b) => b.remainder - a.remainder || a.index - b.index);
  const extra = new Set<number>();
  for (const r of order) {
    if (leftover <= 0) break;
    extra.add(r.index);
    leftover--;
  }
  return raw.map((r) => ({ ...r.u, shareCents: r.floor + (extra.has(r.index) ? 1 : 0) }));
}

/** Split an amount into `n` installments; earlier installments absorb the remainder. */
export function splitInstallments(totalCents: number, n: number) {
  const base = Math.floor(totalCents / n);
  const rest = totalCents - base * n;
  return Array.from({ length: n }, (_, i) => base + (i < rest ? 1 : 0));
}

/** Monthly ordinary cuota per unit for a comunidad configuration. */
export function monthlyCuotas<T extends { coefficient: number }>(
  config: { cuotaMode: "FIXED" | "COEFFICIENT"; cuotaFixedCents: number; cuotaAnnualBudgetCents: number },
  units: T[],
): (T & { shareCents: number })[] {
  if (config.cuotaMode === "FIXED") return units.map((u) => ({ ...u, shareCents: config.cuotaFixedCents }));
  // Round the monthly budget to cents, then split by coefficient.
  return splitByCoefficient(Math.round(config.cuotaAnnualBudgetCents / 12), units);
}

export type CuotaDisplayStatus = "PAID" | "PENDING" | "OVERDUE";

export function displayStatus(c: { status: "PENDING" | "PAID"; dueDate: Date }, now = new Date()): CuotaDisplayStatus {
  if (c.status === "PAID") return "PAID";
  return c.dueDate < now ? "OVERDUE" : "PENDING";
}

export const CUOTA_STATUS_LABELS: Record<CuotaDisplayStatus, string> = {
  PAID: "Pagada",
  PENDING: "Pendiente",
  OVERDUE: "Vencida",
};
