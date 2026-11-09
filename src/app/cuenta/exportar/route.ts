import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

/** Right of access / portability (GDPR arts. 15 and 20): everything we hold about the user, as JSON. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("No autorizado", { status: 401 });

  const memberships = await db.comunidadMember.findMany({
    where: { userId: user.id },
    include: {
      comunidad: { select: { name: true, address: true, city: true } },
      unit: { select: { label: true, floor: true, door: true, coefficient: true } },
      announcements: { select: { title: true, body: true, createdAt: true } },
      incidencias: { select: { title: true, description: true, status: true, createdAt: true } },
      incidenciaUpdates: { select: { note: true, status: true, createdAt: true } },
      votesCast: { select: { choice: true, castAt: true, agendaItem: { select: { title: true } } } },
      rsvps: { select: { attending: true, updatedAt: true } },
      notificationLogs: { select: { channel: true, event: true, success: true, createdAt: true } },
    },
  });
  const nps = await db.npsResponse.findMany({ where: { userId: user.id }, select: { score: true, comment: true, createdAt: true } });

  const data = {
    exportedAt: new Date().toISOString(),
    account: { id: user.id, name: user.name, email: user.email, phone: user.phone, createdAt: user.createdAt, productEmails: user.productEmails },
    memberships,
    nps,
  };
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="mi-comunidad-datos-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
