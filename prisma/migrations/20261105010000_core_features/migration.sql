-- CreateEnum
CREATE TYPE "IncidenciaStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED');

-- CreateEnum
CREATE TYPE "IncidenciaPriority" AS ENUM ('NORMAL', 'URGENT');

-- CreateEnum
CREATE TYPE "IncidenciaLocation" AS ENUM ('PORTAL', 'ESCALERA', 'ASCENSOR', 'GARAJE', 'TERRAZA', 'FACHADA', 'PISCINA', 'ZONAS_COMUNES', 'OTRO');

-- CreateEnum
CREATE TYPE "DocumentCategory" AS ENUM ('ACTA', 'ESTATUTOS', 'SEGURO', 'PRESUPUESTO', 'CONTRATO', 'FACTURA', 'CERTIFICADO', 'OTRO');

-- AlterTable
ALTER TABLE "ComunidadMember" ADD COLUMN     "notifyEmail" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL,
    "comunidadId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "imagePath" TEXT,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "urgent" BOOLEAN NOT NULL DEFAULT false,
    "notifyEmail" BOOLEAN NOT NULL DEFAULT true,
    "notifiedAt" TIMESTAMP(3),
    "recipientsCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnnouncementRead" (
    "announcementId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnnouncementRead_pkey" PRIMARY KEY ("announcementId","memberId")
);

-- CreateTable
CREATE TABLE "Incidencia" (
    "id" TEXT NOT NULL,
    "comunidadId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "location" "IncidenciaLocation" NOT NULL DEFAULT 'OTRO',
    "priority" "IncidenciaPriority" NOT NULL DEFAULT 'NORMAL',
    "status" "IncidenciaStatus" NOT NULL DEFAULT 'OPEN',
    "assignedTo" TEXT,
    "photoPaths" TEXT[],
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Incidencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncidenciaUpdate" (
    "id" TEXT NOT NULL,
    "incidenciaId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "status" "IncidenciaStatus",
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IncidenciaUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "comunidadId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" "DocumentCategory" NOT NULL,
    "year" INTEGER NOT NULL,
    "storagePath" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Announcement_comunidadId_pinned_createdAt_idx" ON "Announcement"("comunidadId", "pinned", "createdAt");

-- CreateIndex
CREATE INDEX "Incidencia_comunidadId_status_idx" ON "Incidencia"("comunidadId", "status");

-- CreateIndex
CREATE INDEX "IncidenciaUpdate_incidenciaId_idx" ON "IncidenciaUpdate"("incidenciaId");

-- CreateIndex
CREATE INDEX "Document_comunidadId_year_idx" ON "Document"("comunidadId", "year");

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_comunidadId_fkey" FOREIGN KEY ("comunidadId") REFERENCES "Comunidad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "ComunidadMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnouncementRead" ADD CONSTRAINT "AnnouncementRead_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnouncementRead" ADD CONSTRAINT "AnnouncementRead_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "ComunidadMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incidencia" ADD CONSTRAINT "Incidencia_comunidadId_fkey" FOREIGN KEY ("comunidadId") REFERENCES "Comunidad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incidencia" ADD CONSTRAINT "Incidencia_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "ComunidadMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidenciaUpdate" ADD CONSTRAINT "IncidenciaUpdate_incidenciaId_fkey" FOREIGN KEY ("incidenciaId") REFERENCES "Incidencia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidenciaUpdate" ADD CONSTRAINT "IncidenciaUpdate_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "ComunidadMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_comunidadId_fkey" FOREIGN KEY ("comunidadId") REFERENCES "Comunidad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "ComunidadMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

