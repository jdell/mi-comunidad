// Ley de Propiedad Horizontal (LPH) rules for juntas. Pure functions — no DB access.
// References: art. 15 (attendance/proxies, morosos), art. 16 (convocatoria, quorum),
// art. 17 (majorities), art. 19 (acta).

export type Majority = "SIMPLE" | "THREE_FIFTHS" | "UNANIMITY" | "INFORMATIVE";
export type Choice = "YES" | "NO" | "ABSTAIN";
export type ItemResult = "APPROVED" | "REJECTED" | "PROVISIONAL" | "NO_VOTE";

/** Art. 16.3: ordinary juntas must be convened at least 6 days in advance. */
export const LEGAL_MIN_NOTICE_DAYS_ORDINARIA = 6;
/** Product recommendation (docs/product-strategy.md): 15 days so every vecino is reached. */
export const RECOMMENDED_NOTICE_DAYS = 15;

export const MAJORITY_LABELS: Record<Majority, { label: string; help: string }> = {
  SIMPLE: { label: "Mayoría simple", help: "Asuntos ordinarios (art. 17.7)" },
  THREE_FIFTHS: { label: "Tres quintos (3/5)", help: "Servicios comunes, ascensor, obras de mejora (art. 17.3)" },
  UNANIMITY: { label: "Unanimidad", help: "Modificar el título constitutivo o estatutos (art. 17.6)" },
  INFORMATIVE: { label: "Sin votación", help: "Informativo, ruegos y preguntas" },
};

export const RESULT_LABELS: Record<ItemResult, string> = {
  APPROVED: "Aprobado",
  REJECTED: "Rechazado",
  PROVISIONAL: "Aprobado provisionalmente (30 días para ausentes)",
  NO_VOTE: "Sin votación",
};

export function daysUntil(date: Date, from = new Date()) {
  return (date.getTime() - from.getTime()) / 86_400_000;
}

/** Returns an error message if the date is not legally valid for the junta type. */
export function noticeError(type: "ORDINARIA" | "EXTRAORDINARIA", scheduledAt: Date, now = new Date()) {
  const days = daysUntil(scheduledAt, now);
  if (days <= 0) return "La fecha de la junta debe ser futura.";
  if (type === "ORDINARIA" && days < LEGAL_MIN_NOTICE_DAYS_ORDINARIA) {
    return `La junta ordinaria debe convocarse con al menos ${LEGAL_MIN_NOTICE_DAYS_ORDINARIA} días de antelación (LPH art. 16.3).`;
  }
  return null;
}

export interface WeightedUnit {
  unitId: string;
  /** Coefficient in percent (e.g. 5.25). */
  coefficient: number;
}

export interface Tally {
  units: number;
  coefficient: number;
}

const sum = (units: WeightedUnit[]): Tally => ({
  units: units.length,
  coefficient: round4(units.reduce((acc, u) => acc + u.coefficient, 0)),
});

function round4(n: number) {
  return Math.round(n * 10_000) / 10_000;
}

/**
 * Quorum on first call (art. 16.2 / 17.7): a majority of owners that also
 * represent a majority of the coefficients must attend (present or represented).
 * On second call there is no minimum quorum.
 */
export function quorum(all: WeightedUnit[], present: WeightedUnit[], secondCall: boolean) {
  const total = sum(all);
  const attending = sum(present);
  const reached = secondCall || (attending.units > total.units / 2 && attending.coefficient > total.coefficient / 2);
  return { total, attending, reached };
}

export interface VoteTally {
  yes: Tally;
  no: Tally;
  abstain: Tally;
  present: Tally;
  total: Tally;
  result: ItemResult;
}

/**
 * Compute the result of an agenda item (art. 17).
 *
 * - SIMPLE on first call: YES must be a majority of all owners and coefficients.
 *   On second call: majority of attendees, also > half of attendees' coefficients.
 * - THREE_FIFTHS: YES from 3/5 of all owners representing 3/5 of coefficients.
 * - UNANIMITY: all owners. If every attendee voted YES but some owners were absent,
 *   the agreement is PROVISIONAL (absentees have 30 days to object, art. 17.8).
 */
export function tallyVotes(opts: {
  majority: Majority;
  all: WeightedUnit[];
  present: WeightedUnit[];
  votes: { unitId: string; choice: Choice }[];
  secondCall: boolean;
}): VoteTally {
  const { majority, all, present, votes, secondCall } = opts;
  const byId = new Map(all.map((u) => [u.unitId, u]));
  const pick = (choice: Choice) =>
    votes.filter((v) => v.choice === choice).map((v) => byId.get(v.unitId)).filter((u): u is WeightedUnit => !!u);

  const yes = sum(pick("YES"));
  const no = sum(pick("NO"));
  const abstain = sum(pick("ABSTAIN"));
  const total = sum(all);
  const presentTally = sum(present);

  let result: ItemResult;
  switch (majority) {
    case "INFORMATIVE":
      result = "NO_VOTE";
      break;
    case "SIMPLE": {
      const base = secondCall ? presentTally : total;
      result = yes.units > base.units / 2 && yes.coefficient > base.coefficient / 2 ? "APPROVED" : "REJECTED";
      break;
    }
    case "THREE_FIFTHS":
      result =
        yes.units * 5 >= total.units * 3 && yes.coefficient * 5 >= total.coefficient * 3 - 1e-9 ? "APPROVED" : "REJECTED";
      break;
    case "UNANIMITY":
      if (no.units > 0 || abstain.units > 0 || yes.units === 0) result = "REJECTED";
      else if (yes.units === total.units) result = "APPROVED";
      else result = yes.units === presentTally.units ? "PROVISIONAL" : "REJECTED";
      break;
  }

  return { yes, no, abstain, present: presentTally, total, result };
}

export function formatPct(n: number, digits = 2) {
  return `${n.toFixed(digits).replace(".", ",")} %`;
}
