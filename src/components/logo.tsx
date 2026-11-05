import Link from "next/link";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-7", className)}>
      <rect width="32" height="32" rx="9" className="fill-primary" />
      <path
        d="M8 24V13.5L16 8l8 5.5V24h-5v-6h-6v6z"
        className="fill-primary-foreground"
      />
      <circle cx="16" cy="13.5" r="1.6" className="fill-primary" />
    </svg>
  );
}

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("flex items-center gap-2 font-semibold", className)}>
      <LogoMark />
      <span className="font-heading text-lg tracking-tight">Mi Comunidad</span>
    </Link>
  );
}
