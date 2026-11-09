import type { Metadata } from "next";
import { PageHeader } from "@/components/app/page-header";
import { requireMember } from "@/lib/auth";
import { MANAGER_ROLES } from "@/lib/roles";
import { AnnouncementForm } from "../announcement-form";

export const metadata: Metadata = { title: "Nuevo anuncio" };

export default async function NewAnnouncementPage({ params }: PageProps<"/c/[id]/anuncios/nuevo">) {
  const { id } = await params;
  await requireMember(id, MANAGER_ROLES);
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Nuevo anuncio" description="Se publicará en el tablón y, si quieres, se enviará por email." />
      <AnnouncementForm comunidadId={id} />
    </div>
  );
}
