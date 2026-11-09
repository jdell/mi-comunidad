import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/app/page-header";
import { requireMember } from "@/lib/auth";
import { db } from "@/lib/db";
import { MANAGER_ROLES } from "@/lib/roles";
import { JuntaForm } from "../../junta-form";

export const metadata: Metadata = { title: "Editar junta" };

function toMadridLocal(d: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

export default async function EditJuntaPage({ params }: PageProps<"/c/[id]/juntas/[jid]/editar">) {
  const { id, jid } = await params;
  await requireMember(id, MANAGER_ROLES);
  const junta = await db.junta.findFirst({
    where: { id: jid, comunidadId: id },
    include: { agendaItems: { orderBy: { order: "asc" } } },
  });
  if (!junta) notFound();
  if (junta.status !== "DRAFT") redirect(`/c/${id}/juntas/${jid}`);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Editar junta" />
      <JuntaForm
        comunidadId={id}
        junta={{
          id: junta.id,
          type: junta.type,
          scheduledAtLocal: toMadridLocal(junta.scheduledAt),
          secondCallMinutes: junta.secondCallAt ? Math.round((junta.secondCallAt.getTime() - junta.scheduledAt.getTime()) / 60_000) : 0,
          location: junta.location,
          notes: junta.notes ?? "",
          agenda: junta.agendaItems.map((i) => ({ title: i.title, description: i.description ?? "", majority: i.majority })),
        }}
      />
    </div>
  );
}
