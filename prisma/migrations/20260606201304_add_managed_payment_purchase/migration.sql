-- CreateTable
CREATE TABLE "ManagedPaymentPurchase" (
    "id" TEXT NOT NULL,
    "stripeSessionId" TEXT NOT NULL,
    "productKey" TEXT NOT NULL DEFAULT 'hamlet-ebook',
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "customerEmail" TEXT,
    "paymentStatus" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ManagedPaymentPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ManagedPaymentPurchase_stripeSessionId_key" ON "ManagedPaymentPurchase"("stripeSessionId");
