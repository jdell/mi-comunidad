import "server-only";
import { db } from "@/lib/db";
import { quorum, tallyVotes, type WeightedUnit } from "@/lib/lph";

export const JUNTA_STATUS_LABELS = {
  DRAFT: "Borrador",
  CONVOCADA: "Convocada",
  EN_CURSO: "En curso",
  CERRADA: "Celebrada",
  CANCELADA: "Cancelada",
} as const;

export const JUNTA_TYPE_LABELS = { ORDINARIA: "Ordinaria", EXTRAORDINARIA: "Extraordinaria" } as const;

export async function loadJunta(comunidadId: string, juntaId: string) {
  const [junta, units] = await Promise.all([
    db.junta.findFirst({
      where: { id: juntaId, comunidadId },
      include: {
        agendaItems: { orderBy: { order: "asc" }, include: { votes: true } },
        attendances: true,
        proxies: {
          include: {
            fromMember: { select: { id: true, displayName: true } },
            toMember: { select: { id: true, displayName: true } },
          },
        },
        rsvps: true,
      },
    }),
    db.unit.findMany({
      where: { comunidadId },
      include: { members: { where: { status: "ACTIVE" }, select: { id: true, displayName: true } } },
      orderBy: [{ floor: "asc" }, { label: "asc" }],
    }),
  ]);
  return junta ? { junta, units } : null;
}

export type LoadedJunta = NonNullable<Awaited<ReturnType<typeof loadJunta>>>;

/**
 * Units in arrears at a given moment, with their overdue debt in cents (LPH art. 15.2):
 * they may attend but cannot vote, and their coefficient is not counted towards majorities.
 */
export async function morosoUnitIds(comunidadId: string, at: Date) {
  const rows = await db.cuota.findMany({
    where: {
      comunidadId,
      dueDate: { lt: at },
      OR: [{ status: "PENDING" }, { paidAt: { gt: at } }],
    },
    select: { unitId: true, amountCents: true },
  });
  const debt = new Map<string, number>();
  for (const r of rows) debt.set(r.unitId, (debt.get(r.unitId) ?? 0) + r.amountCents);
  return debt;
}

/** Quorum and per-item tallies for a loaded junta. */
export function computeJunta({ junta, units }: LoadedJunta, morosos: Map<string, number>) {
  const weighted: WeightedUnit[] = units.map((u) => ({ unitId: u.id, coefficient: u.coefficient.toNumber() }));
  const presentIds = new Set(junta.attendances.map((a) => a.unitId));
  const present = weighted.filter((u) => presentIds.has(u.unitId));
  const q = quorum(weighted, present, junta.heldOnSecondCall);

  // Majorities exclude units deprived of vote (art. 15.2).
  const votingAll = weighted.filter((u) => !morosos.has(u.unitId));
  const votingPresent = present.filter((u) => !morosos.has(u.unitId));

  const items = junta.agendaItems.map((item) => ({
    item,
    tally: tallyVotes({
      majority: item.majority,
      all: votingAll,
      present: votingPresent,
      votes: item.votes.filter((v) => !morosos.has(v.unitId)),
      secondCall: junta.heldOnSecondCall,
    }),
  }));

  return { quorum: q, items, presentIds };
}

/** Units a member can vote for: own unit (unless delegated away) + units delegated to them. */
export function votableUnits(loaded: LoadedJunta, memberId: string, memberUnitId: string | null, morosos: Map<string, number>) {
  const { junta, units } = loaded;
  const delegatedAway = new Set(junta.proxies.filter((p) => p.fromMemberId === memberId).map((p) => p.unitId));
  const ids = new Set<string>();
  if (memberUnitId && !delegatedAway.has(memberUnitId)) ids.add(memberUnitId);
  for (const p of junta.proxies) if (p.toMemberId === memberId) ids.add(p.unitId);
  return units.filter((u) => ids.has(u.id) && !morosos.has(u.id));
}

/** Next convened junta for the dashboard. */
export async function nextJunta(comunidadId: string) {
  return db.junta.findFirst({
    where: { comunidadId, status: { in: ["CONVOCADA", "EN_CURSO"] } },
    orderBy: { scheduledAt: "asc" },
    include: { agendaItems: { orderBy: { order: "asc" }, select: { title: true } } },
  });
}
