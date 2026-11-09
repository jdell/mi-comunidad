import type { Metadata } from "next";
import Link from "next/link";
import { Check, Clock, QrCode, RefreshCw, X } from "lucide-react";
import { CopyButton, WhatsAppButton } from "@/components/app/copy-button";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireMember } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatRelative } from "@/lib/format";
import { MANAGER_ROLES } from "@/lib/roles";
import { appUrl } from "@/lib/urls";
import { regenerateInviteLink, reviewRequest, revokeInvitation, setApprovalMode } from "./actions";
import { InviteDialog } from "./invite-dialog";

export const metadata: Metadata = { title: "Invitar vecinos" };

export default async function InvitePage({ params }: PageProps<"/c/[id]/invitar">) {
  const { id } = await params;
  const { comunidad } = await requireMember(id, MANAGER_ROLES);

  const [units, pendingMembers] = await Promise.all([
    db.unit.findMany({
      where: { comunidadId: id },
      include: {
        members: { where: { status: "ACTIVE" }, select: { displayName: true } },
        invitations: { where: { status: "PENDING" }, orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: [{ floor: "asc" }, { label: "asc" }],
    }),
    db.comunidadMember.findMany({
      where: { comunidadId: id, status: "PENDING" },
      include: { unit: true },
      orderBy: { joinedAt: "asc" },
    }),
  ]);

  const link = appUrl(`/unirse/${comunidad.inviteCode}`);
  const shareText = `¡Hola vecinos! Ya tenemos ${comunidad.name} en Mi Comunidad: anuncios, incidencias y documentos en un solo sitio. Únete aquí: ${link}`;

  return (
    <>
      <PageHeader title="Invitar vecinos" description="Comparte el enlace de la comunidad o invita vivienda por vivienda." />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Enlace de la comunidad</CardTitle>
            <CardDescription>Compártelo en el grupo de WhatsApp. Código: <span className="font-mono font-medium text-foreground">{comunidad.inviteCode}</span></CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="break-all rounded-lg bg-muted p-3 font-mono text-sm">{link}</div>
            <div className="flex flex-wrap gap-2">
              <CopyButton value={link} />
              <WhatsAppButton text={shareText} />
              <Button asChild variant="outline">
                <Link href={`/c/${id}/invitar/poster`}>
                  <QrCode /> Póster QR
                </Link>
              </Button>
            </div>
            <form action={regenerateInviteLink}>
              <input type="hidden" name="comunidadId" value={id} />
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                <RefreshCw /> Generar enlace nuevo (invalida el anterior)
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Aprobación de nuevos vecinos</CardTitle>
            <CardDescription>Las invitaciones personales siempre se aprueban automáticamente.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={setApprovalMode} className="flex flex-col gap-3">
              <input type="hidden" name="comunidadId" value={id} />
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="approvalMode" value="AUTOMATIC" defaultChecked={comunidad.approvalMode === "AUTOMATIC"} className="accent-primary" />
                Automática: quien tenga el enlace entra directamente
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="approvalMode" value="MANUAL" defaultChecked={comunidad.approvalMode === "MANUAL"} className="accent-primary" />
                Manual: apruebo cada solicitud
              </label>
              <Button type="submit" variant="secondary" size="sm" className="w-fit">
                Guardar
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {pendingMembers.length > 0 && (
        <Card className="mt-4 border-warning">
          <CardHeader>
            <CardTitle>Solicitudes pendientes ({pendingMembers.length})</CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            {pendingMembers.map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-medium">{m.displayName}</p>
                  <p className="text-sm text-muted-foreground">
                    {m.unit ? `Vivienda ${m.unit.label}` : "Sin vivienda"} · {m.phone ?? m.email} · {formatRelative(m.joinedAt)}
                  </p>
                </div>
                <form action={reviewRequest} className="flex gap-2">
                  <input type="hidden" name="comunidadId" value={id} />
                  <input type="hidden" name="memberId" value={m.id} />
                  <Button name="decision" value="approve" size="sm">
                    <Check /> Aprobar
                  </Button>
                  <Button name="decision" value="reject" size="sm" variant="destructive">
                    <X /> Rechazar
                  </Button>
                </form>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="mt-4">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="space-y-1.5">
            <CardTitle>Invitar por vivienda</CardTitle>
            <CardDescription>Un enlace personal por vivienda: el vecino queda asignado a su piso.</CardDescription>
          </div>
          <InviteDialog comunidadId={id} />
        </CardHeader>
        <CardContent className="divide-y">
          {units.map((u) => {
            const registered = u.members[0];
            const invitation = u.invitations[0];
            return (
              <div key={u.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="w-14 shrink-0 font-mono text-sm font-medium">{u.label}</span>
                  <span className="truncate text-sm text-muted-foreground">
                    {registered?.displayName ?? invitation?.name ?? "(sin asignar)"}
                  </span>
                </div>
                {registered ? (
                  <Badge variant="secondary">
                    <Check /> Registrado
                  </Badge>
                ) : invitation ? (
                  <div className="flex items-center gap-1">
                    <Badge variant="outline">
                      <Clock /> {invitation.sentAt ? "Enviada" : "Pendiente"}
                    </Badge>
                    <form action={revokeInvitation}>
                      <input type="hidden" name="comunidadId" value={id} />
                      <input type="hidden" name="invitationId" value={invitation.id} />
                      <Button size="icon-sm" variant="ghost" aria-label="Revocar invitación">
                        <X />
                      </Button>
                    </form>
                    <InviteDialog comunidadId={id} unit={{ id: u.id, label: u.label }} trigger={<Button size="sm" variant="ghost">Reenviar</Button>} />
                  </div>
                ) : (
                  <InviteDialog comunidadId={id} unit={{ id: u.id, label: u.label }} />
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </>
  );
}
