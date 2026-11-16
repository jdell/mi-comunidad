// Pure helpers for admin courtesy grants of the Pro plan (no DB, unit-tested).

export const COURTESY_DURATIONS = {
  "1w": { label: "1 semana", days: 7 },
  "1m": { label: "1 mes", months: 1 },
  "3m": { label: "3 meses", months: 3 },
  "6m": { label: "6 meses", months: 6 },
} as const satisfies Record<string, { label: string; days?: number; months?: number }>;

export type CourtesyDuration = keyof typeof COURTESY_DURATIONS;
export const DEFAULT_COURTESY_DURATION: CourtesyDuration = "1m";
export const COURTESY_DURATION_KEYS = Object.keys(COURTESY_DURATIONS) as [CourtesyDuration, ...CourtesyDuration[]];

function addMonthsClamped(date: Date, months: number) {
  const d = new Date(date);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, lastDay));
  return d;
}

/**
 * New expiry for a grant of `duration`. Extends from the current expiry while it is
 * still active (so "Ampliar" never loses days), otherwise starts from now.
 */
export function courtesyUntil(duration: CourtesyDuration, current: Date | null, now = new Date()) {
  const from = current && current > now ? current : now;
  const spec: { days?: number; months?: number } = COURTESY_DURATIONS[duration];
  return spec.months ? addMonthsClamped(from, spec.months) : new Date(from.getTime() + (spec.days ?? 0) * 86_400_000);
}
