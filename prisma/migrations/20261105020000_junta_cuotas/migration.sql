-- CreateEnum
CREATE TYPE "JuntaType" AS ENUM ('ORDINARIA', 'EXTRAORDINARIA');

-- CreateEnum
CREATE TYPE "JuntaStatus" AS ENUM ('DRAFT', 'CONVOCADA', 'EN_CURSO', 'CERRADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "MajorityType" AS ENUM ('SIMPLE', 'THREE_FIFTHS', 'UNANIMITY', 'INFORMATIVE');

-- CreateEnum
CREATE TYPE "AgendaItemResult" AS ENUM ('APPROVED', 'REJECTED', 'PROVISIONAL', 'NO_VOTE');

-- CreateEnum
CREATE TYPE "VoteChoice" AS ENUM ('YES', 'NO', 'ABSTAIN');

-- CreateEnum
CREATE TYPE "AttendanceType" AS ENUM ('IN_PERSON', 'REMOTE', 'PROXY');

-- CreateEnum
CREATE TYPE "CuotaMode" AS ENUM ('FIXED', 'COEFFICIENT');

-- CreateEnum
CREATE TYPE "CuotaKind" AS ENUM ('ORDINARIA', 'DERRAMA');

-- CreateEnum
CREATE TYPE "CuotaStatus" AS ENUM ('PENDING', 'PAID');

-- AlterTable
ALTER TABLE "Comunidad" ADD COLUMN     "cuotaAnnualBudgetCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "cuotaDueDay" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "cuotaFixedCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "cuotaMode" "CuotaMode" NOT NULL DEFAULT 'FIXED';

-- CreateTable
CREATE TABLE "Junta" (
    "id" TEXT NOT NULL,
    "comunidadId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "type" "JuntaType" NOT NULL DEFAULT 'ORDINARIA',
    "status" "JuntaStatus" NOT NULL DEFAULT 'DRAFT',
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "secondCallAt" TIMESTAMP(3),
    "location" TEXT NOT NULL,
    "notes" TEXT,
    "convocadaAt" TIMESTAMP(3),
    "recipientsCount" INTEGER NOT NULL DEFAULT 0,
    "reminderSentAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "heldOnSecondCall" BOOLEAN NOT NULL DEFAULT false,
    "presidentName" TEXT,
    "secretaryName" TEXT,
    "closedAt" TIMESTAMP(3),
    "actaNotes" TEXT,
    "actaPublishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Junta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgendaItem" (
    "id" TEXT NOT NULL,
    "juntaId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "majority" "MajorityType" NOT NULL DEFAULT 'SIMPLE',
    "votingOpen" BOOLEAN NOT NULL DEFAULT false,
    "votingDone" BOOLEAN NOT NULL DEFAULT false,
    "result" "AgendaItemResult",
    "resolution" TEXT,

    CONSTRAINT "AgendaItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vote" (
    "id" TEXT NOT NULL,
    "agendaItemId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "choice" "VoteChoice" NOT NULL,
    "castByMemberId" TEXT,
    "castAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JuntaAttendance" (
    "id" TEXT NOT NULL,
    "juntaId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "type" "AttendanceType" NOT NULL,
    "representativeName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JuntaAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProxyDelegation" (
    "id" TEXT NOT NULL,
    "juntaId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "fromMemberId" TEXT NOT NULL,
    "toMemberId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProxyDelegation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JuntaRsvp" (
    "id" TEXT NOT NULL,
    "juntaId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "attending" BOOLEAN NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JuntaRsvp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cuota" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "comunidadId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "kind" "CuotaKind" NOT NULL DEFAULT 'ORDINARIA',
    "period" TEXT NOT NULL,
    "derramaId" TEXT,
    "installment" INTEGER NOT NULL DEFAULT 1,
    "amountCents" INTEGER NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" "CuotaStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "lastReminderAt" TIMESTAMP(3),
    "remindersCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cuota_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Derrama" (
    "id" TEXT NOT NULL,
    "comunidadId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "totalCents" INTEGER NOT NULL,
    "installments" INTEGER NOT NULL DEFAULT 1,
    "firstDueDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Derrama_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Junta_comunidadId_scheduledAt_idx" ON "Junta"("comunidadId", "scheduledAt");

-- CreateIndex
CREATE INDEX "AgendaItem_juntaId_order_idx" ON "AgendaItem"("juntaId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "Vote_agendaItemId_unitId_key" ON "Vote"("agendaItemId", "unitId");

-- CreateIndex
CREATE UNIQUE INDEX "JuntaAttendance_juntaId_unitId_key" ON "JuntaAttendance"("juntaId", "unitId");

-- CreateIndex
CREATE UNIQUE INDEX "ProxyDelegation_juntaId_unitId_key" ON "ProxyDelegation"("juntaId", "unitId");

-- CreateIndex
CREATE UNIQUE INDEX "JuntaRsvp_juntaId_memberId_key" ON "JuntaRsvp"("juntaId", "memberId");

-- CreateIndex
CREATE UNIQUE INDEX "Cuota_key_key" ON "Cuota"("key");

-- CreateIndex
CREATE INDEX "Cuota_comunidadId_period_idx" ON "Cuota"("comunidadId", "period");

-- CreateIndex
CREATE INDEX "Cuota_comunidadId_status_dueDate_idx" ON "Cuota"("comunidadId", "status", "dueDate");

-- AddForeignKey
ALTER TABLE "Junta" ADD CONSTRAINT "Junta_comunidadId_fkey" FOREIGN KEY ("comunidadId") REFERENCES "Comunidad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Junta" ADD CONSTRAINT "Junta_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "ComunidadMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgendaItem" ADD CONSTRAINT "AgendaItem_juntaId_fkey" FOREIGN KEY ("juntaId") REFERENCES "Junta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_agendaItemId_fkey" FOREIGN KEY ("agendaItemId") REFERENCES "AgendaItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_castByMemberId_fkey" FOREIGN KEY ("castByMemberId") REFERENCES "ComunidadMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JuntaAttendance" ADD CONSTRAINT "JuntaAttendance_juntaId_fkey" FOREIGN KEY ("juntaId") REFERENCES "Junta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JuntaAttendance" ADD CONSTRAINT "JuntaAttendance_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProxyDelegation" ADD CONSTRAINT "ProxyDelegation_juntaId_fkey" FOREIGN KEY ("juntaId") REFERENCES "Junta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProxyDelegation" ADD CONSTRAINT "ProxyDelegation_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProxyDelegation" ADD CONSTRAINT "ProxyDelegation_fromMemberId_fkey" FOREIGN KEY ("fromMemberId") REFERENCES "ComunidadMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProxyDelegation" ADD CONSTRAINT "ProxyDelegation_toMemberId_fkey" FOREIGN KEY ("toMemberId") REFERENCES "ComunidadMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JuntaRsvp" ADD CONSTRAINT "JuntaRsvp_juntaId_fkey" FOREIGN KEY ("juntaId") REFERENCES "Junta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JuntaRsvp" ADD CONSTRAINT "JuntaRsvp_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "ComunidadMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cuota" ADD CONSTRAINT "Cuota_comunidadId_fkey" FOREIGN KEY ("comunidadId") REFERENCES "Comunidad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cuota" ADD CONSTRAINT "Cuota_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cuota" ADD CONSTRAINT "Cuota_derramaId_fkey" FOREIGN KEY ("derramaId") REFERENCES "Derrama"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Derrama" ADD CONSTRAINT "Derrama_comunidadId_fkey" FOREIGN KEY ("comunidadId") REFERENCES "Comunidad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

