import type { Metadata } from "next";
import { Logo } from "@/components/logo";
import { UserMenu } from "@/components/app/user-menu";
import { Badge } from "@/components/ui/badge";
import { requireAdmin } from "@/lib/admin";
import { AdminNav } from "./admin-nav";

export const metadata: Metadata = { title: { default: "Administración", template: "%s · Admin · Mi Comunidad" }, robots: { index: false } };

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await requireAdmin();
  return (
    <div className="min-h-dvh">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <Logo href="/admin" />
            <Badge variant="secondary">Admin</Badge>
          </div>
          <UserMenu name={user.name ?? user.email ?? "Admin"} isAdmin />
        </div>
        <div className="mx-auto max-w-6xl px-4 pb-3">
          <AdminNav />
        </div>
      </header>
      <main className="mx-auto max-w-6xl p-4 py-6">{children}</main>
    </div>
  );
}
