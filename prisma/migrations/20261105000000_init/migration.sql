-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "MemberRole" AS ENUM ('PRESIDENT', 'SECRETARY', 'TREASURER', 'VECINO');

-- CreateEnum
CREATE TYPE "MemberStatus" AS ENUM ('PENDING', 'ACTIVE', 'REMOVED');

-- CreateEnum
CREATE TYPE "ApprovalMode" AS ENUM ('AUTOMATIC', 'MANUAL');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comunidad" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT,
    "postalCode" TEXT,
    "cif" TEXT,
    "unitsCount" INTEGER NOT NULL,
    "inviteCode" TEXT NOT NULL,
    "approvalMode" "ApprovalMode" NOT NULL DEFAULT 'AUTOMATIC',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Comunidad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Unit" (
    "id" TEXT NOT NULL,
    "comunidadId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "floor" TEXT,
    "door" TEXT,
    "coefficient" DECIMAL(7,4) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Unit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComunidadMember" (
    "id" TEXT NOT NULL,
    "comunidadId" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "unitId" TEXT,
    "role" "MemberRole" NOT NULL DEFAULT 'VECINO',
    "status" "MemberStatus" NOT NULL DEFAULT 'ACTIVE',
    "displayName" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComunidadMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invitation" (
    "id" TEXT NOT NULL,
    "comunidadId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "unitId" TEXT,
    "name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "role" "MemberRole" NOT NULL DEFAULT 'VECINO',
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "createdById" UUID NOT NULL,
    "acceptedById" UUID,
    "sentAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Comunidad_inviteCode_key" ON "Comunidad"("inviteCode");

-- CreateIndex
CREATE INDEX "Unit_comunidadId_idx" ON "Unit"("comunidadId");

-- CreateIndex
CREATE UNIQUE INDEX "Unit_comunidadId_label_key" ON "Unit"("comunidadId", "label");

-- CreateIndex
CREATE INDEX "ComunidadMember_userId_idx" ON "ComunidadMember"("userId");

-- CreateIndex
CREATE INDEX "ComunidadMember_unitId_idx" ON "ComunidadMember"("unitId");

-- CreateIndex
CREATE UNIQUE INDEX "ComunidadMember_comunidadId_userId_key" ON "ComunidadMember"("comunidadId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_code_key" ON "Invitation"("code");

-- CreateIndex
CREATE INDEX "Invitation_comunidadId_idx" ON "Invitation"("comunidadId");

-- AddForeignKey
ALTER TABLE "Unit" ADD CONSTRAINT "Unit_comunidadId_fkey" FOREIGN KEY ("comunidadId") REFERENCES "Comunidad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComunidadMember" ADD CONSTRAINT "ComunidadMember_comunidadId_fkey" FOREIGN KEY ("comunidadId") REFERENCES "Comunidad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComunidadMember" ADD CONSTRAINT "ComunidadMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComunidadMember" ADD CONSTRAINT "ComunidadMember_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_comunidadId_fkey" FOREIGN KEY ("comunidadId") REFERENCES "Comunidad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_acceptedById_fkey" FOREIGN KEY ("acceptedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

