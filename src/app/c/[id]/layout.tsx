import Link from "next/link";
import { LogoMark } from "@/components/logo";
import { BottomNav, SideNav } from "@/components/app/app-nav";
import { UserMenu } from "@/components/app/user-menu";
import { PlanBanner } from "@/components/app/plan-banner";
import { isPlatformAdminEmail } from "@/lib/admin";
import { getEntitlements, requireMember } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/roles";

export default async function ComunidadLayout({ children, params }: LayoutProps<"/c/[id]">) {
  const { id } = await params;
  const { user, member, comunidad } = await requireMember(id);
  const base = `/c/${id}`;
  const entitlements = await getEntitlements(comunidad);

  return (
    <div className="flex min-h-dvh">
      <aside className="no-print sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-6 border-r bg-sidebar p-4 md:flex">
        <Link href={base} className="flex items-center gap-2">
          <LogoMark />
          <span className="font-heading font-semibold">Mi Comunidad</span>
        </Link>
        <div className="rounded-xl border bg-background/60 p-3">
          <p className="truncate text-sm font-medium">{comunidad.name}</p>
          <p className="truncate text-xs text-muted-foreground">{comunidad.address}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {ROLE_LABELS[member.role]}
            {member.unit ? ` · ${member.unit.label}` : ""}
          </p>
        </div>
        <SideNav base={base} role={member.role} />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b bg-background/90 px-4 backdrop-blur">
          <Link href={base} className="flex min-w-0 items-center gap-2 md:hidden">
            <LogoMark className="size-6 shrink-0" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold leading-tight">{comunidad.name}</p>
              <p className="truncate text-xs leading-tight text-muted-foreground">{comunidad.address}</p>
            </div>
          </Link>
          <div className="hidden md:block" />
          <UserMenu name={member.displayName || user.name || "Mi cuenta"} isAdmin={isPlatformAdminEmail(user.email)} />
        </header>
        <PlanBanner comunidadId={id} entitlements={entitlements} unitsCount={comunidad.unitsCount} canManage={member.role === "PRESIDENT"} />
        <main className="mx-auto w-full max-w-5xl flex-1 p-4 pb-24 md:p-8 md:pb-8">{children}</main>
      </div>
      <BottomNav base={base} role={member.role} />
    </div>
  );
}
