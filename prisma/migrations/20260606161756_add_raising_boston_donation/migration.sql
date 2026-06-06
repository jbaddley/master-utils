-- CreateTable
CREATE TABLE "RaisingBostonDonation" (
    "id" TEXT NOT NULL,
    "stripeSessionId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RaisingBostonDonation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RaisingBostonDonation_stripeSessionId_key" ON "RaisingBostonDonation"("stripeSessionId");
