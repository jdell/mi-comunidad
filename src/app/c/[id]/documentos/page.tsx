import type { Metadata } from "next";
import Link from "next/link";
import { Download, FileText, FolderOpen, Trash2 } from "lucide-react";
import type { DocumentCategory } from "@/generated/prisma/enums";
import { EmptyState, PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireMember } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { DOCUMENT_CATEGORY } from "@/lib/labels";
import { isManager } from "@/lib/roles";
import { cn } from "@/lib/utils";
import { deleteDocument } from "./actions";
import { UploadDialog } from "./upload-dialog";

export const metadata: Metadata = { title: "Documentos" };

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
}

export default async function DocumentsPage({ params, searchParams }: PageProps<"/c/[id]/documentos">) {
  const { id } = await params;
  const { tipo } = await searchParams;
  const { member } = await requireMember(id);
  const manager = isManager(member.role);
  const category = typeof tipo === "string" && tipo in DOCUMENT_CATEGORY ? (tipo as DocumentCategory) : undefined;

  const documents = await db.document.findMany({
    where: { comunidadId: id, ...(category ? { category } : {}) },
    orderBy: [{ year: "desc" }, { createdAt: "desc" }],
  });
  const byYear = new Map<number, typeof documents>();
  for (const d of documents) byYear.set(d.year, [...(byYear.get(d.year) ?? []), d]);

  return (
    <>
      <PageHeader
        title="Documentos"
        description="Actas, estatutos, seguro y presupuestos de la comunidad."
        actions={manager && <UploadDialog comunidadId={id} />}
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <Link
          href={`/c/${id}/documentos`}
          className={cn("rounded-full border px-3 py-1 text-sm", !category ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted")}
        >
          Todos
        </Link>
        {Object.entries(DOCUMENT_CATEGORY).map(([value, label]) => (
          <Link
            key={value}
            href={`/c/${id}/documentos?tipo=${value}`}
            className={cn("rounded-full border px-3 py-1 text-sm", category === value ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted")}
          >
            {label}
          </Link>
        ))}
      </div>
      {documents.length === 0 ? (
        <EmptyState
          icon={<FolderOpen className="size-5" />}
          title="No hay documentos"
          description={manager ? "Sube las actas, los estatutos y la póliza del seguro para tenerlo todo a mano." : undefined}
        />
      ) : (
        <div className="space-y-4">
          {[...byYear.entries()].map(([year, docs]) => (
            <Card key={year}>
              <CardHeader>
                <CardTitle>{year}</CardTitle>
              </CardHeader>
              <CardContent className="divide-y">
                {docs.map((d) => (
                  <div key={d.id} className="flex items-center gap-3 py-3">
                    <FileText className="size-5 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{d.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(d.createdAt)} · {formatSize(d.sizeBytes)}
                      </p>
                    </div>
                    <Badge variant="secondary" className="hidden sm:inline-flex">{DOCUMENT_CATEGORY[d.category]}</Badge>
                    <Button asChild size="icon-sm" variant="ghost" aria-label="Descargar">
                      <a href={`/c/${id}/documentos/${d.id}/descargar`} target="_blank" rel="noreferrer">
                        <Download />
                      </a>
                    </Button>
                    {manager && (
                      <form action={deleteDocument}>
                        <input type="hidden" name="comunidadId" value={id} />
                        <input type="hidden" name="documentId" value={d.id} />
                        <Button size="icon-sm" variant="ghost" aria-label="Eliminar">
                          <Trash2 className="text-destructive" />
                        </Button>
                      </form>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
