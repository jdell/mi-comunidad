import type { MemberRole } from "@/generated/prisma/enums";

export const ROLE_LABELS: Record<MemberRole, string> = {
  PRESIDENT: "Presidente/a",
  SECRETARY: "Secretario/a",
  TREASURER: "Tesorero/a",
  VECINO: "Vecino/a",
};

/** Junta directiva: president, secretary, treasurer. */
export const BOARD_ROLES: MemberRole[] = ["PRESIDENT", "SECRETARY", "TREASURER"];

/** Can post announcements, manage documents, juntas and invitations. */
export const MANAGER_ROLES: MemberRole[] = ["PRESIDENT", "SECRETARY"];

/** Can manage cuotas and derramas. */
export const FINANCE_ROLES: MemberRole[] = ["PRESIDENT", "TREASURER"];

export const isBoard = (role: MemberRole) => BOARD_ROLES.includes(role);
export const isManager = (role: MemberRole) => MANAGER_ROLES.includes(role);
export const isFinance = (role: MemberRole) => FINANCE_ROLES.includes(role);
