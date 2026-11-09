import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { signedUrl } from "@/lib/storage";

// Authorize, then redirect to a short-lived signed URL.
export async function GET(_req: NextRequest, ctx: RouteContext<"/c/[id]/documentos/[did]/descargar">) {
  const { id, did } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return new NextResponse("No autorizado", { status: 401 });

  const member = await db.comunidadMember.findUnique({
    where: { comunidadId_userId: { comunidadId: id, userId: user.id } },
  });
  if (member?.status !== "ACTIVE") return new NextResponse("No encontrado", { status: 404 });

  const doc = await db.document.findFirst({ where: { id: did, comunidadId: id } });
  if (!doc) return new NextResponse("No encontrado", { status: 404 });

  const url = await signedUrl(doc.storagePath, { expiresIn: 60 });
  if (!url) return new NextResponse("Almacenamiento no disponible", { status: 503 });
  return NextResponse.redirect(url);
}
