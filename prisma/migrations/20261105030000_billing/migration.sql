-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('GRATIS', 'COMUNIDAD', 'PRO', 'ADMINISTRADOR');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('NONE', 'TRIALING', 'ACTIVE', 'PAST_DUE', 'UNPAID', 'INCOMPLETE', 'CANCELED');

-- CreateEnum
CREATE TYPE "BillingEventType" AS ENUM ('TRIAL_STARTED', 'SUBSCRIBED', 'PLAN_CHANGED', 'PAYMENT_SUCCEEDED', 'PAYMENT_FAILED', 'CANCELED');

-- AlterTable
ALTER TABLE "Comunidad" ADD COLUMN     "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "currentPeriodEnd" TIMESTAMP(3),
ADD COLUMN     "plan" "Plan" NOT NULL DEFAULT 'GRATIS',
ADD COLUMN     "stripeCustomerId" TEXT,
ADD COLUMN     "stripeSubscriptionId" TEXT,
ADD COLUMN     "subscriptionStatus" "SubscriptionStatus" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "trialEndsAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "StripeEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StripeEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingEvent" (
    "id" TEXT NOT NULL,
    "comunidadId" TEXT NOT NULL,
    "type" "BillingEventType" NOT NULL,
    "plan" "Plan",
    "mrrCents" INTEGER NOT NULL DEFAULT 0,
    "amountCents" INTEGER,
    "stripeEventId" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BillingEvent_occurredAt_idx" ON "BillingEvent"("occurredAt");

-- CreateIndex
CREATE INDEX "BillingEvent_comunidadId_occurredAt_idx" ON "BillingEvent"("comunidadId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "Comunidad_stripeCustomerId_key" ON "Comunidad"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Comunidad_stripeSubscriptionId_key" ON "Comunidad"("stripeSubscriptionId");

-- AddForeignKey
ALTER TABLE "BillingEvent" ADD CONSTRAINT "BillingEvent_comunidadId_fkey" FOREIGN KEY ("comunidadId") REFERENCES "Comunidad"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Backfill: existing comunidades get a 14-day trial from their creation date.
UPDATE "Comunidad" SET "trialEndsAt" = "createdAt" + INTERVAL '14 days' WHERE "trialEndsAt" IS NULL;
