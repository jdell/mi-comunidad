-- AlterEnum
ALTER TYPE "BillingEventType" ADD VALUE 'REFERRAL_CREDIT';

-- AlterTable
ALTER TABLE "Comunidad" ADD COLUMN     "referralCode" TEXT,
ADD COLUMN     "referralConvertedAt" TIMESTAMP(3),
ADD COLUMN     "referralCreditPendingCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "referralFollowUpSentAt" TIMESTAMP(3),
ADD COLUMN     "referralRewardCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "referredById" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Comunidad_referralCode_key" ON "Comunidad"("referralCode");

-- CreateIndex
CREATE INDEX "Comunidad_referredById_idx" ON "Comunidad"("referredById");

-- AddForeignKey
ALTER TABLE "Comunidad" ADD CONSTRAINT "Comunidad_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "Comunidad"("id") ON DELETE SET NULL ON UPDATE CASCADE;

