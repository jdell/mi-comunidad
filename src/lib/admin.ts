import "server-only";
import { notFound } from "next/navigation";
import { getCurrentUser, requireUser } from "@/lib/auth";

/** Comma-separated allow-list. Empty or unset means nobody is an admin (fail closed). */
function adminEmails() {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isPlatformAdminEmail(email: string | null | undefined) {
  if (!email) return false;
  return adminEmails().includes(email.toLowerCase());
}

export async function isPlatformAdmin() {
  const user = await getCurrentUser();
  return isPlatformAdminEmail(user?.email);
}

/** Guard for /admin: 404 for anyone not on ADMIN_EMAILS (don't reveal the panel exists). */
export async function requireAdmin() {
  const user = await requireUser("/admin");
  if (!isPlatformAdminEmail(user.email)) notFound();
  return user;
}
