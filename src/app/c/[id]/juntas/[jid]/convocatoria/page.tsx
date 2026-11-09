import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { LegalDoc } from "@/components/app/legal-doc";
import { PrintButton } from "@/components/app/print-button";
import { Button } from "@/components/ui/button";
import { requireMember } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatCents, formatDate } from "@/lib/format";
import { loadJunta, morosoUnitIds } from "@/lib/juntas";
import { isManager } from "@/lib/roles";

export const metadata: Metadata = { title: "Convocatoria" };

const time = (d: Date) => new Intl.DateTimeFormat("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" }).format(d);
const longDate = (d: Date) => formatDate(d, { weekday: "long" });

export default async function ConvocatoriaPage({ params }: PageProps<"/c/[id]/juntas/[jid]/convocatoria">) {
  const { id, jid } = await params;
  const { member, comunidad } = await requireMember(id);
  const loaded = await loadJunta(id, jid);
  if (!loaded || (loaded.junta.status === "DRAFT" && !isManager(member.role))) notFound();
  const { junta, units } = loaded;

  const president = await db.comunidadMember.findFirst({ where: { comunidadId: id, role: "PRESIDENT", status: "ACTIVE" } });
  // LPH art. 16.2: the convocatoria lists owners not up to date with their debts.
  const morosos = await morosoUnitIds(id, junta.convocadaAt ?? new Date());
  const morosoRows = units.filter((u) => morosos.has(u.id));
  const kind = junta.type === "ORDINARIA" ? "ordinaria" : "extraordinaria";
  const issued = junta.convocadaAt ?? new Date();

  return (
    <div className="space-y-4">
      <div className="no-print flex items-center justify-between">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/c/${id}/juntas/${jid}`}><ArrowLeft /> Volver a la junta</Link>
        </Button>
        <PrintButton label="Imprimir / PDF" />
      </div>
      <LegalDoc>
        <div className="text-center text-sm">
          <p className="font-bold uppercase">Comunidad de Propietarios {comunidad.name}</p>
          <p>{comunidad.address}{comunidad.postalCode ? `, ${comunidad.postalCode}` : ""}{comunidad.city ? ` ${comunidad.city}` : ""}</p>
          {comunidad.cif && <p>CIF {comunidad.cif}</p>}
        </div>
        <h1>Convocatoria de Junta General {kind}</h1>
        <p>
          Por orden del/de la Presidente/a de la Comunidad, {president?.displayName ?? "—"}, y de conformidad con lo dispuesto en el
          artículo 16 de la Ley de Propiedad Horizontal, se le convoca a la <strong>Junta General {kind}</strong> de propietarios que se
          celebrará el <strong>{longDate(junta.scheduledAt)}</strong>, en <strong>{junta.location}</strong>, a las{" "}
          <strong>{time(junta.scheduledAt)} horas en primera convocatoria</strong>
          {junta.secondCallAt && (
            <>
              {" "}y, de no alcanzarse el quórum necesario, a las <strong>{time(junta.secondCallAt)} horas en segunda convocatoria</strong>
            </>
          )}
          , para tratar el siguiente
        </p>
        <h2>Orden del día</h2>
        <ol className="list-decimal space-y-1 pl-6">
          {junta.agendaItems.map((i) => (
            <li key={i.id}>
              {i.title}
              {i.description && <span className="block text-sm text-neutral-600">{i.description}</span>}
            </li>
          ))}
        </ol>
        {junta.notes && <p className="whitespace-pre-line">{junta.notes}</p>}

        <h2>Propietarios no al corriente de pago</h2>
        {morosoRows.length === 0 ? (
          <p>A la fecha de esta convocatoria todos los propietarios se encuentran al corriente de pago.</p>
        ) : (
          <>
            <p>
              Conforme a los artículos 15.2 y 16.2 de la LPH, los siguientes propietarios no se encuentran al corriente en el pago de las
              deudas vencidas con la Comunidad. Podrán participar en las deliberaciones, pero no tendrán derecho a voto salvo que
              hubieran satisfecho o consignado judicial o notarialmente la deuda antes del inicio de la junta:
            </p>
            <table>
              <thead><tr><th>Vivienda</th><th className="text-right">Importe vencido</th></tr></thead>
              <tbody>
                {morosoRows.map((u) => (
                  <tr key={u.id}><td>{u.label}</td><td className="text-right">{formatCents(morosos.get(u.id)!)}</td></tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        <p className="text-sm">
          Los propietarios que no puedan asistir podrán delegar su voto en otra persona mediante escrito firmado (art. 15.1 LPH) o desde la
          aplicación Mi Comunidad.
        </p>
        <p>
          {comunidad.city ?? ""}{comunidad.city ? ", a " : "A "}{formatDate(issued)}.
        </p>
        <div className="pt-8">
          <p>Fdo.: {president?.displayName ?? "El/La Presidente/a"}</p>
          <p className="text-sm text-neutral-600">Presidente/a de la Comunidad</p>
        </div>

        <div className="mt-10 border-t border-dashed border-neutral-400 pt-6 text-sm">
          <h2>Delegación de voto</h2>
          <p>
            D./Dña. ______________________________, propietario/a de la vivienda ________, delega su representación y voto para la
            Junta General {kind} del {formatDate(junta.scheduledAt)} en D./Dña. ______________________________.
          </p>
          <p className="pt-6">Firma: ______________________</p>
        </div>
      </LegalDoc>
    </div>
  );
}
