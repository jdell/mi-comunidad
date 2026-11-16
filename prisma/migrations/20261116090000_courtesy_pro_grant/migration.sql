-- AlterEnum
ALTER TYPE "BillingEventType" ADD VALUE 'COURTESY_GRANTED';
ALTER TYPE "BillingEventType" ADD VALUE 'COURTESY_REVOKED';

-- AlterTable
ALTER TABLE "Comunidad" ADD COLUMN     "proGrantedUntil" TIMESTAMP(3);
