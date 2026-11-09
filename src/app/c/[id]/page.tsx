import Link from "next/link";
import { UserPlus } from "lucide-react";
import { PageHeader, StatCard } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { requireMember } from "@/lib/auth";
import { db } from "@/lib/db";
import { isManager } from "@/lib/roles";

export default async function ComunidadHome({ params }: PageProps<"/c/[id]">) {
  const { id } = await params;
  const { member, comunidad } = await requireMember(id);

  const [members, pending, units] = await Promise.all([
    db.comunidadMember.count({ where: { comunidadId: id, status: "ACTIVE" } }),
    db.comunidadMember.count({ where: { comunidadId: id, status: "PENDING" } }),
    db.unit.count({ where: { comunidadId: id } }),
  ]);

  return (
    <>
      <PageHeader
        title={`Hola, ${member.displayName.split(" ")[0]}`}
        description={comunidad.name}
        actions={
          isManager(member.role) && (
            <Button asChild>
              <Link href={`/c/${id}/invitar`}>
                <UserPlus /> Invitar vecinos
              </Link>
            </Button>
          )
        }
      />
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="vecinos activos" value={members} />
        <StatCard label="viviendas" value={units} />
        <StatCard label="solicitudes pendientes" value={pending} />
      </div>
    </>
  );
}
