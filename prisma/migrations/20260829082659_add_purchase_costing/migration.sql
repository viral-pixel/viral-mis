-- CreateTable
CREATE TABLE "PurchaseItemCategory" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT '',
    "hasAmount" BOOLEAN NOT NULL DEFAULT true,
    "hasQuantity" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseItemCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthlyPurchase" (
    "id" SERIAL NOT NULL,
    "month" TIMESTAMP(3) NOT NULL,
    "itemCategoryId" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION,
    "quantity" DOUBLE PRECISION,
    "enteredBy" TEXT NOT NULL DEFAULT '',
    "importBatch" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthlyPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseItemCategory_name_key" ON "PurchaseItemCategory"("name");

-- CreateIndex
CREATE INDEX "MonthlyPurchase_month_idx" ON "MonthlyPurchase"("month");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyPurchase_month_itemCategoryId_key" ON "MonthlyPurchase"("month", "itemCategoryId");

-- AddForeignKey
ALTER TABLE "MonthlyPurchase" ADD CONSTRAINT "MonthlyPurchase_itemCategoryId_fkey" FOREIGN KEY ("itemCategoryId") REFERENCES "PurchaseItemCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
