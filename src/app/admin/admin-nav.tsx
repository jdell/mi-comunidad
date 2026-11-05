"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/admin", label: "Resumen" },
  { href: "/admin/comunidades", label: "Comunidades" },
  { href: "/admin/ingresos", label: "Ingresos" },
  { href: "/admin/referidos", label: "Recomendaciones" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto">
      {ITEMS.map((i) => {
        const active = i.href === "/admin" ? pathname === "/admin" : pathname.startsWith(i.href);
        return (
          <Link
            key={i.href}
            href={i.href}
            className={cn("rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap", active ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
          >
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
