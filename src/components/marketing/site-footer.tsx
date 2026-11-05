import Link from "next/link";
import { LogoMark } from "@/components/logo";

export function SiteFooter() {
  return (
    <footer className="border-t bg-muted/40">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <LogoMark className="size-5" />
          <span>© {new Date().getFullYear()} Mi Comunidad · Hecho en España · Datos alojados en la UE</span>
        </div>
        <nav className="flex gap-4">
          <Link href="/privacidad" className="hover:text-foreground">Privacidad</Link>
          <Link href="/terminos" className="hover:text-foreground">Términos</Link>
          <a href="mailto:info@yakasista.com" className="hover:text-foreground">Contacto</a>
        </nav>
      </div>
    </footer>
  );
}
