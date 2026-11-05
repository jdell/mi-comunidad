import Link from "next/link";
import { Compass } from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Página no encontrada" };

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="p-4">
        <Logo />
      </header>
      <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="rounded-full bg-secondary p-4 text-secondary-foreground">
          <Compass className="size-8" />
        </div>
        <p className="font-heading text-6xl font-semibold text-primary">404</p>
        <h1 className="text-2xl font-semibold">Esta puerta no lleva a ningún sitio</h1>
        <p className="max-w-md text-muted-foreground">
          La página que buscas no existe o no tienes acceso a ella. Si te han enviado un enlace de invitación, puede que haya caducado.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button asChild>
            <Link href="/c">Ir a mis comunidades</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Página de inicio</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
