import type { Metadata } from "next";
import { Mail, Phone, UserMinus } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { NativeSelect } from "@/components/app/native-select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireMember } from "@/lib/auth";
import { db } from "@/lib/db";
import { initials } from "@/lib/format";
import { isBoard, ROLE_LABELS } from "@/lib/roles";
import { changeRole, removeMember } from "./actions";
import { TransferForm } from "./transfer-form";

export const metadata: Metadata = { title: "Vecinos" };

export default async function DirectoryPage({ params, searchParams }: PageProps<"/c/[id]/vecinos">) {
  const { id } = await params;
  const { transferido } = await searchParams;
  const { member: me } = await requireMember(id);
  const board = isBoard(me.role);
  const president = me.role === "PRESIDENT";

  const members = await db.comunidadMember.findMany({
    where: { comunidadId: id, status: "ACTIVE" },
    include: { unit: true, user: { select: { email: true, phone: true } } },
  });
  const roleOrder = { PRESIDENT: 0, SECRETARY: 1, TREASURER: 2, VECINO: 3 };
  members.sort(
    (a, b) =>
      roleOrder[a.role] - roleOrder[b.role] ||
      (a.unit?.label ?? "~").localeCompare(b.unit?.label ?? "~", "es", { numeric: true }),
  );

  return (
    <>
      <PageHeader
        title="Vecinos"
        description={`${members.length} vecinos registrados${board ? "" : ". Los datos de contacto solo los ve la junta directiva."}`}
      />
      {transferido && (
        <Alert className="mb-4 border-success">
          <AlertDescription>Presidencia transferida correctamente.</AlertDescription>
        </Alert>
      )}
      <Card>
        <CardContent className="divide-y">
          {members.map((m) => {
            // Full contact details: visible to the board, or for board members (so vecinos can reach them).
            const showContact = board || isBoard(m.role) || m.id === me.id;
            const phone = m.phone ?? m.user.phone;
            const email = m.email ?? m.user.email;
            return (
              <div key={m.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <Avatar>
                    <AvatarFallback className="bg-secondary text-secondary-foreground">{initials(m.displayName)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 font-medium">
                      {m.displayName}
                      {m.role !== "VECINO" && <Badge>{ROLE_LABELS[m.role]}</Badge>}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {m.unit
                        ? [m.unit.label, m.unit.floor && `planta ${m.unit.floor}`, m.unit.door && `puerta ${m.unit.door}`].filter(Boolean).join(" · ")
                        : "Sin vivienda asignada"}
                    </p>
                    {showContact && (phone || email) && (
                      <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                        {phone && (
                          <a href={`tel:${phone}`} className="inline-flex items-center gap-1 hover:text-primary">
                            <Phone className="size-3.5" /> {phone}
                          </a>
                        )}
                        {email && (
                          <a href={`mailto:${email}`} className="inline-flex items-center gap-1 hover:text-primary">
                            <Mail className="size-3.5" /> {email}
                          </a>
                        )}
                      </p>
                    )}
                  </div>
                </div>
                {president && m.id !== me.id && (
                  <div className="flex items-center gap-2">
                    <form action={changeRole} className="flex items-center gap-2">
                      <input type="hidden" name="comunidadId" value={id} />
                      <input type="hidden" name="memberId" value={m.id} />
                      <NativeSelect name="role" defaultValue={m.role} className="h-8 w-36" aria-label="Rol">
                        <option value="VECINO">Vecino/a</option>
                        <option value="SECRETARY">Secretario/a</option>
                        <option value="TREASURER">Tesorero/a</option>
                      </NativeSelect>
                      <Button size="sm" variant="outline">Guardar</Button>
                    </form>
                    <form action={removeMember}>
                      <input type="hidden" name="comunidadId" value={id} />
                      <input type="hidden" name="memberId" value={m.id} />
                      <Button size="icon-sm" variant="ghost" aria-label={`Dar de baja a ${m.displayName}`}>
                        <UserMinus className="text-destructive" />
                      </Button>
                    </form>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {president && members.length > 1 && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Cambiar presidente</CardTitle>
            <CardDescription>Traspasa la presidencia tras la junta, por dimisión o por venta del piso.</CardDescription>
          </CardHeader>
          <CardContent>
            <TransferForm
              comunidadId={id}
              candidates={members
                .filter((m) => m.id !== me.id)
                .map((m) => ({ id: m.id, label: `${m.displayName}${m.unit ? ` (${m.unit.label})` : ""}` }))}
            />
          </CardContent>
        </Card>
      )}
    </>
  );
}
