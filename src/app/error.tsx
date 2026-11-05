"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RotateCcw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="rounded-full bg-destructive/10 p-4 text-destructive">
        <TriangleAlert className="size-8" />
      </div>
      <p className="font-heading text-6xl font-semibold text-primary">500</p>
      <h1 className="text-2xl font-semibold">Algo ha fallado</h1>
      <p className="max-w-md text-muted-foreground">
        Ha ocurrido un error inesperado. Ya lo estamos revisando. Prueba de nuevo en unos segundos.
      </p>
      {error.digest && <p className="font-mono text-xs text-muted-foreground">Referencia: {error.digest}</p>}
      <div className="flex flex-wrap justify-center gap-2">
        <Button onClick={reset}>
          <RotateCcw /> Reintentar
        </Button>
        <Button asChild variant="outline">
          <Link href="/c">Ir a mis comunidades</Link>
        </Button>
      </div>
    </main>
  );
}
