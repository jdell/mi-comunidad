import "server-only";
import { db } from "@/lib/db";

const DAY = 86_400_000;

/** Ask members who have used the product for 14+ days, at most every 90 days; respect dismissals for 30 days. */
export async function shouldAskNps(userId: string, joinedAt: Date, now = new Date()) {
  if (now.getTime() - joinedAt.getTime() < 14 * DAY) return false;
  const last = await db.npsResponse.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } });
  if (!last) return true;
  const age = now.getTime() - last.createdAt.getTime();
  return last.score === null ? age > 30 * DAY : age > 90 * DAY;
}

/** NPS = % promoters (9-10) − % detractors (0-6). */
export function npsScore(scores: number[]) {
  if (scores.length === 0) return null;
  const promoters = scores.filter((s) => s >= 9).length;
  const detractors = scores.filter((s) => s <= 6).length;
  return Math.round(((promoters - detractors) / scores.length) * 100);
}
