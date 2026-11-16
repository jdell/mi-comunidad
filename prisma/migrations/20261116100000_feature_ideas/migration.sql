-- CreateEnum
CREATE TYPE "IdeaStatus" AS ENUM ('NEW', 'REVIEWING', 'PLANNED', 'COMPLETED', 'DISMISSED');

-- CreateTable
CREATE TABLE "FeatureIdea" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "IdeaStatus" NOT NULL DEFAULT 'NEW',
    "response" TEXT,
    "adminNote" TEXT,
    "authorId" UUID,
    "comunidadId" TEXT,
    "mergedIntoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeatureIdea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdeaVote" (
    "ideaId" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdeaVote_pkey" PRIMARY KEY ("ideaId","userId")
);

-- CreateIndex
CREATE INDEX "FeatureIdea_status_idx" ON "FeatureIdea"("status");

-- CreateIndex
CREATE INDEX "FeatureIdea_mergedIntoId_idx" ON "FeatureIdea"("mergedIntoId");

-- CreateIndex
CREATE INDEX "FeatureIdea_authorId_createdAt_idx" ON "FeatureIdea"("authorId", "createdAt");

-- CreateIndex
CREATE INDEX "IdeaVote_userId_idx" ON "IdeaVote"("userId");

-- AddForeignKey
ALTER TABLE "FeatureIdea" ADD CONSTRAINT "FeatureIdea_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeatureIdea" ADD CONSTRAINT "FeatureIdea_comunidadId_fkey" FOREIGN KEY ("comunidadId") REFERENCES "Comunidad"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeatureIdea" ADD CONSTRAINT "FeatureIdea_mergedIntoId_fkey" FOREIGN KEY ("mergedIntoId") REFERENCES "FeatureIdea"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdeaVote" ADD CONSTRAINT "IdeaVote_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "FeatureIdea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdeaVote" ADD CONSTRAINT "IdeaVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

