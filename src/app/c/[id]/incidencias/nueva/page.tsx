import type { Metadata } from "next";
import { PageHeader } from "@/components/app/page-header";
import { requireMember } from "@/lib/auth";
import { NewIncidenciaForm } from "../new-form";

export const metadata: Metadata = { title: "Nueva incidencia" };

export default async function NewIncidenciaPage({ params }: PageProps<"/c/[id]/incidencias/nueva">) {
  const { id } = await params;
  await requireMember(id);
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Reportar incidencia" description="La junta recibirá un aviso inmediatamente." />
      <NewIncidenciaForm comunidadId={id} />
    </div>
  );
}
