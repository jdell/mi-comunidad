import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Megaphone } from "lucide-react";
import { LegalDoc } from "@/components/app/legal-doc";
import { PrintButton } from "@/components/app/print-button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { requireMember } from "@/lib/auth";
import { formatDate, formatDateTime } from "@/lib/format";
import { computeJunta, loadJunta, morosoUnitIds } from "@/lib/juntas";
import { formatPct, MAJORITY_LABELS, RESULT_LABELS } from "@/lib/lph";
import { isManager } from "@/lib/roles";
import { publishActa, saveActaNotes } from "../../actions";

export const metadata: Metadata = { title: "Acta" };

const time = (d: Date) => new Intl.DateTimeFormat("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" }).format(d);
const ATTENDANCE = { IN_PERSON: "Presente", REMOTE: "Telemático", PROXY: "Representado" } as const;

export default async function ActaPage({ params }: PageProps<"/c/[id]/juntas/[jid]/acta">) {
  const { id, jid } = await params;
  const { member, comunidad } = await requireMember(id);
  const manager = isManager(member.role);
  const loaded = await loadJunta(id, jid);
  if (!loaded || loaded.junta.status !== "CERRADA") notFound();
  if (!loaded.junta.actaPublishedAt && !manager) notFound();
  const { junta, units } = loaded;

  const morosos = await morosoUnitIds(id, junta.startedAt ?? junta.scheduledAt);
  const computed = computeJunta(loaded, morosos);
  const unitById = new Map(units.map((u) => [u.id, u]));
  const owner = (unitId: string) => unitById.get(unitId)?.members.map((m) => m.displayName).join(", ") || "—";
  const kind = junta.type === "ORDINARIA" ? "ordinaria" : "extraordinaria";
  const startedAt = junta.startedAt ?? junta.scheduledAt;

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/c/${id}/juntas/${jid}`}><ArrowLeft /> Volver a la junta</Link>
        </Button>
        <PrintButton label="Imprimir / PDF" />
      </div>

      {manager && (
        <div className="no-print mx-auto grid max-w-3xl gap-4">
          {!junta.actaPublishedAt ? (
            <Alert>
              <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
                <span>El acta es un borrador visible solo para la junta directiva.</span>
                <form action={publishActa}>
                  <input type="hidden" name="comunidadId" value={id} />
                  <input type="hidden" name="juntaId" value={jid} />
                  <Button size="sm"><Megaphone /> Publicar y notificar a los vecinos</Button>
                </form>
              </AlertDescription>
            </Alert>
          ) : (
            <Alert className="border-success">
              <AlertDescription>Acta publicada el {formatDateTime(junta.actaPublishedAt)}.</AlertDescription>
            </Alert>
          )}
          <Card>
            <CardHeader><CardTitle>Observaciones del acta</CardTitle></CardHeader>
            <CardContent>
              <form action={saveActaNotes} className="space-y-2">
                <input type="hidden" name="comunidadId" value={id} />
                <input type="hidden" name="juntaId" value={jid} />
                <Textarea name="actaNotes" rows={4} defaultValue={junta.actaNotes ?? ""} placeholder="Intervenciones relevantes, ruegos y preguntas, incidencias de la sesión…" />
                <Button size="sm" variant="outline">Guardar observaciones</Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      <LegalDoc>
        <div className="text-center text-sm">
          <p className="font-bold uppercase">Comunidad de Propietarios {comunidad.name}</p>
          <p>{comunidad.address}{comunidad.city ? `, ${comunidad.city}` : ""}</p>
          {comunidad.cif && <p>CIF {comunidad.cif}</p>}
        </div>
        <h1>Acta de la Junta General {kind}</h1>
        <p>
          En {junta.location}, siendo las {time(startedAt)} horas del {formatDate(startedAt, { weekday: "long" })}, se reúnen en{" "}
          <strong>{junta.heldOnSecondCall ? "segunda" : "primera"} convocatoria</strong> los propietarios que se relacionan a continuación,
          bajo la presidencia de <strong>{junta.presidentName ?? "—"}</strong>, actuando como secretario/a{" "}
          <strong>{junta.secretaryName ?? "—"}</strong>, previa convocatoria efectuada el {junta.convocadaAt ? formatDate(junta.convocadaAt) : "—"}.
        </p>

        <h2>Asistentes</h2>
        <table className="text-sm">
          <thead><tr><th>Vivienda</th><th>Propietario/a</th><th>Asistencia</th><th className="text-right">Coef.</th></tr></thead>
          <tbody>
            {junta.attendances
              .map((a) => ({ a, u: unitById.get(a.unitId)! }))
              .sort((x, y) => x.u.label.localeCompare(y.u.label, "es", { numeric: true }))
              .map(({ a, u }) => (
                <tr key={a.id}>
                  <td>{u.label}</td>
                  <td>{owner(u.id)}</td>
                  <td>{ATTENDANCE[a.type]}{a.type === "PROXY" && a.representativeName ? ` por ${a.representativeName}` : ""}</td>
                  <td className="text-right">{formatPct(u.coefficient.toNumber(), 4)}</td>
                </tr>
              ))}
          </tbody>
        </table>
        <p>
          Asisten, presentes o representados, <strong>{computed.quorum.attending.units}</strong> de {computed.quorum.total.units} propietarios,
          que representan el <strong>{formatPct(computed.quorum.attending.coefficient)}</strong> de las cuotas de participación.{" "}
          {computed.quorum.reached
            ? "Existiendo quórum suficiente, se declara válidamente constituida la junta."
            : "No se alcanza el quórum requerido para la primera convocatoria."}
        </p>
        {morosos.size > 0 && (
          <p>
            <strong>Propietarios privados del derecho de voto</strong> por no estar al corriente de pago (art. 15.2 LPH), cuya cuota no se
            computa a efectos de mayorías:{" "}
            {[...morosos.keys()].map((u) => `${unitById.get(u)?.label} (${owner(u)})`).join("; ")}.
          </p>
        )}

        <h2>Orden del día y acuerdos</h2>
        {computed.items.map(({ item, tally }) => {
          const namesFor = (choice: "YES" | "NO") =>
            item.votes.filter((v) => v.choice === choice && !morosos.has(v.unitId)).map((v) => `${unitById.get(v.unitId)?.label} (${owner(v.unitId)})`);
          return (
            <section key={item.id} className="space-y-1">
              <p className="font-bold">{item.order}. {item.title}</p>
              {item.description && <p className="text-sm text-neutral-600">{item.description}</p>}
              {item.majority === "INFORMATIVE" ? (
                <p>Punto informativo, sin votación.</p>
              ) : item.result === "NO_VOTE" ? (
                <p>El punto no se sometió a votación.</p>
              ) : (
                <>
                  <p className="text-sm">
                    Votación ({MAJORITY_LABELS[item.majority].label.toLowerCase()}): a favor {tally.yes.units} {tally.yes.units === 1 ? "propietario" : "propietarios"}
                    ({formatPct(tally.yes.coefficient)}); en contra {tally.no.units} ({formatPct(tally.no.coefficient)}); abstenciones{" "}
                    {tally.abstain.units} ({formatPct(tally.abstain.coefficient)}).
                  </p>
                  {namesFor("YES").length > 0 && <p className="text-sm">Votan a favor: {namesFor("YES").join("; ")}.</p>}
                  {namesFor("NO").length > 0 && <p className="text-sm">Votan en contra: {namesFor("NO").join("; ")}.</p>}
                  <p><strong>Resultado: {RESULT_LABELS[item.result ?? tally.result]}.</strong></p>
                </>
              )}
              {item.resolution && <p><em>Acuerdo:</em> {item.resolution}</p>}
            </section>
          );
        })}

        {junta.actaNotes && (
          <>
            <h2>Observaciones</h2>
            <p className="whitespace-pre-line">{junta.actaNotes}</p>
          </>
        )}

        <p>
          Los acuerdos se notificarán a los propietarios ausentes, que dispondrán de un plazo de treinta días naturales para manifestar su
          discrepancia (art. 17.8 LPH). Y no habiendo más asuntos que tratar, se levanta la sesión siendo las{" "}
          {time(junta.closedAt ?? startedAt)} horas, de lo que como secretario/a doy fe con el visto bueno del/de la presidente/a.
        </p>
        <div className="grid grid-cols-2 gap-8 pt-10 text-sm">
          <div>
            <p>Vº Bº El/La Presidente/a</p>
            <p className="pt-10">Fdo.: {junta.presidentName}</p>
          </div>
          <div>
            <p>El/La Secretario/a</p>
            <p className="pt-10">Fdo.: {junta.secretaryName}</p>
          </div>
        </div>
      </LegalDoc>
    </div>
  );
}
