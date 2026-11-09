import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Trash2 } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { requireMember } from "@/lib/auth";
import { db } from "@/lib/db";
import { MANAGER_ROLES } from "@/lib/roles";
import { signedUrl } from "@/lib/storage";
import { deleteAnnouncement } from "../../actions";
import { AnnouncementForm } from "../../announcement-form";

export const metadata: Metadata = { title: "Editar anuncio" };

export default async function EditAnnouncementPage({ params }: PageProps<"/c/[id]/anuncios/[aid]/editar">) {
  const { id, aid } = await params;
  await requireMember(id, MANAGER_ROLES);
  const a = await db.announcement.findFirst({ where: { id: aid, comunidadId: id } });
  if (!a) notFound();
  const imageUrl = a.imagePath ? await signedUrl(a.imagePath) : null;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Editar anuncio"
        actions={
          <form action={deleteAnnouncement}>
            <input type="hidden" name="comunidadId" value={id} />
            <input type="hidden" name="announcementId" value={a.id} />
            <Button variant="destructive">
              <Trash2 /> Eliminar
            </Button>
          </form>
        }
      />
      <AnnouncementForm
        comunidadId={id}
        announcement={{ id: a.id, title: a.title, body: a.body, pinned: a.pinned, urgent: a.urgent, notifyEmail: a.notifyEmail, imageUrl }}
      />
    </div>
  );
}
