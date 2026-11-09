import { WifiOff } from "lucide-react";

export const metadata = { title: "Sin conexión" };

export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 p-6 text-center">
      <WifiOff className="size-10 text-muted-foreground" />
      <h1 className="text-2xl font-semibold">Sin conexión</h1>
      <p className="max-w-sm text-muted-foreground">
        No hay internet ahora mismo. Las páginas que ya has visitado siguen disponibles; vuelve a intentarlo en un momento.
      </p>
    </main>
  );
}
