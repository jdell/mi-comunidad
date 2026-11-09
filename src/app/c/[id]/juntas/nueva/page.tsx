import type { Metadata } from "next";
import { PageHeader } from "@/components/app/page-header";
import { requireMember } from "@/lib/auth";
import { MANAGER_ROLES } from "@/lib/roles";
import { JuntaForm } from "../junta-form";

export const metadata: Metadata = { title: "Convocar junta" };

export default async function NewJuntaPage({ params }: PageProps<"/c/[id]/juntas/nueva">) {
  const { id } = await params;
  await requireMember(id, MANAGER_ROLES);
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Convocar junta" description="Prepara el borrador; podrás revisar la convocatoria antes de enviarla." />
      <JuntaForm comunidadId={id} />
    </div>
  );
}
