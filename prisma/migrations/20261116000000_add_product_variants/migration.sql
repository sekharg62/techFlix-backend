-- Product variants (e.g. "Mobile", "Desktop / TV"), each grouping its own plans.
-- Additive only: existing plans keep variantId = NULL and behave exactly as before.

-- CreateTable
CREATE TABLE "ProductVariant" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "inStock" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductVariant_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "ProductPlan" ADD COLUMN "variantId" TEXT;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN "variantName" TEXT;

-- CreateIndex
CREATE INDEX "ProductVariant_productId_sortOrder_idx" ON "ProductVariant"("productId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariant_productId_name_key" ON "ProductVariant"("productId", "name");

-- CreateIndex
CREATE INDEX "ProductPlan_variantId_sortOrder_idx" ON "ProductPlan"("variantId", "sortOrder");

-- AddForeignKey
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductPlan" ADD CONSTRAINT "ProductPlan_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
