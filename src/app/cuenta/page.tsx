import type { Metadata } from "next";
import { Logo } from "@/components/logo";
import { UserMenu } from "@/components/app/user-menu";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isPlatformAdminEmail } from "@/lib/admin";
import { requireUser } from "@/lib/auth";
import { AccountForm } from "./account-form";

export const metadata: Metadata = { title: "Mi cuenta" };

export default async function AccountPage() {
  const user = await requireUser("/cuenta");
  return (
    <div className="min-h-dvh">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <Logo href="/c" />
        <UserMenu name={user.name ?? user.email ?? user.phone ?? "Mi cuenta"} isAdmin={isPlatformAdminEmail(user.email)} />
      </header>
      <main className="mx-auto max-w-2xl space-y-4 p-4 py-8">
        <h1 className="text-2xl font-semibold">Mi cuenta</h1>
        <Card>
          <CardHeader>
            <CardTitle>Datos personales</CardTitle>
            <CardDescription>
              {[user.phone, user.email].filter(Boolean).join(" · ") || "Sin datos de contacto"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AccountForm name={user.name ?? ""} />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
