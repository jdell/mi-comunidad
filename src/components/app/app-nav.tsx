"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Building2,
  CalendarDays,
  Wallet,
  FileText,
  Home,
  Megaphone,
  Menu,
  Settings,
  UserPlus,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { MemberRole } from "@/generated/prisma/enums";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Shown in the mobile bottom bar (max 4). */
  primary?: boolean;
  roles?: MemberRole[];
}

// Order matters: this is the sidebar order. Sub-paths are relative to /c/[id].
const NAV_ITEMS: NavItem[] = [
  { href: "", label: "Inicio", icon: Home, primary: true },
  { href: "/anuncios", label: "Anuncios", icon: Megaphone, primary: true },
  { href: "/incidencias", label: "Incidencias", icon: Wrench, primary: true },
  { href: "/juntas", label: "Juntas", icon: CalendarDays, primary: true },
  { href: "/documentos", label: "Documentos", icon: FileText },
  { href: "/cuotas", label: "Cuotas", icon: Wallet },
  { href: "/vecinos", label: "Vecinos", icon: Users },
  { href: "/invitar", label: "Invitar vecinos", icon: UserPlus, roles: ["PRESIDENT", "SECRETARY"] },
  { href: "/unidades", label: "Viviendas", icon: Building2, roles: ["PRESIDENT", "SECRETARY", "TREASURER"] },
  { href: "/ajustes", label: "Ajustes", icon: Settings },
];

function useItems(role: MemberRole) {
  return NAV_ITEMS.filter((i) => !i.roles || i.roles.includes(role));
}

function isActive(pathname: string, base: string, href: string) {
  const full = `${base}${href}`;
  return href === "" ? pathname === base : pathname === full || pathname.startsWith(`${full}/`);
}

export function SideNav({ base, role }: { base: string; role: MemberRole }) {
  const pathname = usePathname();
  const items = useItems(role);
  return (
    <nav className="flex flex-col gap-1">
      {items.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={`${base}${href}`}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            isActive(pathname, base, href) && "bg-sidebar-accent text-sidebar-accent-foreground",
          )}
        >
          <Icon className="size-4" />
          {label}
        </Link>
      ))}
    </nav>
  );
}

export function BottomNav({ base, role }: { base: string; role: MemberRole }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const items = useItems(role);
  const primary = items.filter((i) => i.primary).slice(0, 4);
  const rest = items.filter((i) => !primary.includes(i));

  return (
    <nav className="no-print fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <div className="grid" style={{ gridTemplateColumns: `repeat(${primary.length + 1}, minmax(0, 1fr))` }}>
        {primary.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={`${base}${href}`}
            className={cn(
              "flex flex-col items-center gap-1 py-2 text-[11px] text-muted-foreground",
              isActive(pathname, base, href) && "text-primary",
            )}
          >
            <Icon className="size-5" />
            {label}
          </Link>
        ))}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger className="flex flex-col items-center gap-1 py-2 text-[11px] text-muted-foreground">
            <Menu className="size-5" />
            Más
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-2xl pb-[calc(env(safe-area-inset-bottom)+1rem)]">
            <SheetHeader>
              <SheetTitle>Más opciones</SheetTitle>
            </SheetHeader>
            <div className="grid grid-cols-3 gap-2 px-4">
              {rest.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={`${base}${href}`}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-xl border p-3 text-center text-xs",
                    isActive(pathname, base, href) && "border-primary text-primary",
                  )}
                >
                  <Icon className="size-5" />
                  {label}
                </Link>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
