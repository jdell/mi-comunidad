import Link from "next/link";
import {
  Bell,
  CalendarCheck,
  FileText,
  Megaphone,
  Smartphone,
  Vote,
  Wallet,
  Wrench,
} from "lucide-react";
import { PricingTable } from "@/components/marketing/pricing-table";
import { Button } from "@/components/ui/button";

const FEATURES = [
  { icon: Megaphone, title: "Anuncios", text: "Avisos a todos los vecinos por email y WhatsApp. Se acabó el papel en el portal." },
  { icon: Wrench, title: "Incidencias", text: "Reporta averías con foto y sigue su estado: abierta, en curso, resuelta." },
  { icon: FileText, title: "Documentos", text: "Actas, estatutos, seguro y presupuestos ordenados por año, siempre a mano." },
  { icon: CalendarCheck, title: "Juntas según la LPH", text: "Convocatoria con 15 días de antelación, orden del día y control de quórum." },
  { icon: Vote, title: "Votaciones y actas", text: "Votos ponderados por coeficiente, delegaciones y acta generada automáticamente." },
  { icon: Wallet, title: "Cuotas y derramas", text: "Quién ha pagado y quién no, recordatorios automáticos y reparto por coeficiente." },
];

const FAQ = [
  {
    q: "¿Necesitan los vecinos instalar una app?",
    a: "No. Mi Comunidad funciona desde el navegador del móvil y se puede añadir a la pantalla de inicio. Los avisos llegan por email o WhatsApp.",
  },
  {
    q: "¿Es válido legalmente?",
    a: "Las convocatorias, el quórum y las actas siguen la Ley de Propiedad Horizontal (arts. 16, 17 y 19). Recomendamos revisar siempre los estatutos de tu comunidad.",
  },
  {
    q: "¿Dónde se guardan los datos?",
    a: "En servidores de la Unión Europea (Frankfurt), cumpliendo el RGPD y la LOPDGDD. La comunidad es dueña de sus datos y puede exportarlos cuando quiera.",
  },
  {
    q: "¿Qué pasa cuando cambia el presidente?",
    a: "El presidente transfiere su rol a otro vecino con un clic. Todo el historial se queda en la comunidad.",
  },
];

export default function LandingPage() {
  return (
    <>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,var(--color-accent),transparent_60%),radial-gradient(ellipse_at_bottom_left,var(--color-secondary),transparent_55%)]" />
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
          <div className="space-y-6">
            <p className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-sm text-muted-foreground">
              <Smartphone className="size-4 text-primary" /> Pensada para presidentes, no para expertos
            </p>
            <h1 className="text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
              Tu comunidad de vecinos, <span className="text-primary">sin grupos de WhatsApp</span> ni papeles en el portal.
            </h1>
            <p className="text-lg text-muted-foreground">
              Anuncios, incidencias, documentos, juntas y cuotas en una sola app. Configúrala en 10 minutos e invita a
              tus vecinos con un enlace.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-11 px-6 text-base">
                <Link href="/login?next=/onboarding">Crear mi comunidad gratis</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-11 px-6 text-base">
                <Link href="/login">Tengo un código de invitación</Link>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">Gratis hasta 10 viviendas. Sin tarjeta.</p>
          </div>
          <div className="mx-auto w-full max-w-sm rounded-[2rem] border-8 border-foreground/80 bg-background p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="font-heading font-semibold">C/ Gran Vía 42</p>
                <p className="text-xs text-muted-foreground">18 vecinos activos</p>
              </div>
              <Bell className="size-5 text-muted-foreground" />
            </div>
            <div className="mb-3 grid grid-cols-3 gap-2 text-center">
              {[["18", "vecinos"], ["2", "incidencias"], ["15 jun", "junta"]].map(([v, l]) => (
                <div key={l} className="rounded-xl bg-muted p-2">
                  <p className="font-semibold">{v}</p>
                  <p className="text-[11px] text-muted-foreground">{l}</p>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <div className="rounded-xl border bg-card p-3">
                <p className="text-sm font-medium">Corte de agua mañana 9–14h</p>
                <p className="text-xs text-muted-foreground">María (presidenta) · hace 2 h</p>
              </div>
              <div className="rounded-xl border bg-card p-3">
                <p className="text-sm font-medium">Ascensor averiado</p>
                <p className="text-xs text-muted-foreground">
                  <span className="rounded bg-warning px-1.5 py-0.5 text-warning-foreground">En curso</span> · Antonio (3B)
                </p>
              </div>
              <div className="rounded-xl border bg-card p-3">
                <p className="text-sm font-medium">Junta ordinaria · 15 de junio</p>
                <p className="text-xs text-muted-foreground">Quórum alcanzado · 82,4 % coeficiente</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="funciones" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16">
        <h2 className="mb-2 text-3xl font-semibold tracking-tight">Todo lo que tu comunidad necesita</h2>
        <p className="mb-10 text-muted-foreground">Sin formación, sin administrador obligatorio, desde el móvil.</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-2xl border bg-card p-6">
              <div className="mb-4 inline-flex rounded-xl bg-secondary p-2.5 text-secondary-foreground">
                <Icon className="size-5" />
              </div>
              <h3 className="mb-1 text-lg font-semibold">{title}</h3>
              <p className="text-sm text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="precios" className="scroll-mt-20 bg-muted/40 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="mb-2 text-3xl font-semibold tracking-tight">Precios claros</h2>
          <p className="mb-10 text-muted-foreground">
            9 € al mes repartidos entre 20 vecinos son 0,45 € por vivienda. Un administrador cuesta 100–300 € al mes.
            IVA no incluido.
          </p>
          <PricingTable />
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-16">
        <h2 className="mb-8 text-3xl font-semibold tracking-tight">Preguntas frecuentes</h2>
        <div className="space-y-3">
          {FAQ.map(({ q, a }) => (
            <details key={q} className="group rounded-xl border bg-card p-4">
              <summary className="cursor-pointer list-none font-medium">{q}</summary>
              <p className="mt-2 text-sm text-muted-foreground">{a}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}
