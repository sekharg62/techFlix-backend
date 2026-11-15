-- Subscription end date per delivered order item (deliveredAt + planDurationDays), indexed for fast alerts.

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN "expiresAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "OrderItem_expiresAt_idx" ON "OrderItem"("expiresAt");

-- Backfill items that were already delivered
UPDATE "OrderItem"
SET "expiresAt" = "deliveredAt" + ("planDurationDays" * INTERVAL '1 day')
WHERE "deliveredAt" IS NOT NULL AND "planDurationDays" IS NOT NULL AND "expiresAt" IS NULL;
