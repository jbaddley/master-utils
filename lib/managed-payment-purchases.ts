import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { isHamletManagedPayment } from "@/lib/hamlet-ebook";

export async function recordManagedPaymentPurchase(
  session: Stripe.Checkout.Session,
): Promise<void> {
  if (!isHamletManagedPayment(session.metadata)) return;
  if (session.payment_status !== "paid") return;

  const amountCents = session.amount_total;
  if (!amountCents || amountCents <= 0) return;

  await prisma.managedPaymentPurchase.upsert({
    where: { stripeSessionId: session.id },
    create: {
      stripeSessionId: session.id,
      productKey: "hamlet-ebook",
      amountCents,
      currency: session.currency ?? "usd",
      customerEmail: session.customer_details?.email ?? undefined,
      paymentStatus: session.payment_status,
    },
    update: {
      paymentStatus: session.payment_status,
      customerEmail: session.customer_details?.email ?? undefined,
    },
  });
}
