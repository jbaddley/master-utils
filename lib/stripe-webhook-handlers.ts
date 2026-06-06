import type Stripe from "stripe";
import { recordManagedPaymentPurchase } from "@/lib/managed-payment-purchases";
import { isRaisingBostonDonation } from "@/lib/raising-boston";
import { prisma } from "@/lib/prisma";
import {
  customerIdFromStripeObject,
  downgradeUserByCustomerId,
  ensureStripeCustomerLinked,
  handleDeletedStripeCustomer,
  linkStripeCustomerToUser,
  syncUserPlanFromCheckoutSession,
  syncUserPlanFromSubscription,
} from "@/lib/stripe-subscription";

async function recordRaisingBostonDonation(session: Stripe.Checkout.Session) {
  if (session.payment_status !== "paid") return;

  const metadata = session.metadata ?? {};
  if (!isRaisingBostonDonation(metadata)) return;

  const amountCents = session.amount_total;
  if (!amountCents || amountCents <= 0) return;

  await prisma.raisingBostonDonation.upsert({
    where: { stripeSessionId: session.id },
    create: {
      stripeSessionId: session.id,
      amountCents,
      currency: session.currency ?? "usd",
    },
    update: {},
  });
}

async function handleCheckoutSessionEvent(
  stripe: Stripe,
  session: Stripe.Checkout.Session,
) {
  await Promise.all([
    recordRaisingBostonDonation(session),
    recordManagedPaymentPurchase(session),
    syncUserPlanFromCheckoutSession(stripe, session),
  ]);
}

async function handleCustomerPaymentMethodEvent(
  stripe: Stripe,
  object: { customer?: string | Stripe.Customer | Stripe.DeletedCustomer | null },
) {
  const customerId = customerIdFromStripeObject(object);
  if (!customerId) return;
  await ensureStripeCustomerLinked(stripe, customerId);
}

export async function handleStripeWebhookEvent(
  stripe: Stripe,
  event: Stripe.Event,
) {
  const eventType = event.type as string;

  if (
    eventType === "checkout.session.completed" ||
    eventType === "checkout.session.async_payment_succeeded" ||
    eventType === "checkout.session.async_payment_failed"
  ) {
    const session = event.data.object as Stripe.Checkout.Session;
    await handleCheckoutSessionEvent(stripe, session);
    return;
  }

  if (eventType === "checkout.session.expired") {
    return;
  }

  if (
    eventType === "customer.subscription.created" ||
    eventType === "customer.subscription.updated" ||
    eventType === "customer.subscription.paused" ||
    eventType === "customer.subscription.resumed" ||
    eventType === "customer.subscription.pending_update_applied" ||
    eventType === "customer.subscription.pending_update_expired"
  ) {
    const subscription = event.data.object as Stripe.Subscription;
    await syncUserPlanFromSubscription(stripe, subscription);
    return;
  }

  if (eventType === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;
    const customerId = customerIdFromStripeObject(subscription);
    if (customerId) {
      await downgradeUserByCustomerId(stripe, customerId);
    }
    return;
  }

  if (eventType === "customer.subscription.trial_will_end") {
    return;
  }

  if (eventType === "customer.created" || eventType === "customer.updated") {
    const customer = event.data.object as Stripe.Customer;
    if (!customer.deleted) {
      await linkStripeCustomerToUser(stripe, customer);
    }
    return;
  }

  if (eventType === "customer.deleted") {
    const customer = event.data.object as { id: string };
    await handleDeletedStripeCustomer(stripe, customer.id);
    return;
  }

  if (
    eventType === "customer.bank_account.created" ||
    eventType === "customer.bank_account.updated" ||
    eventType === "customer.bank_account.deleted" ||
    eventType === "customer.card.created" ||
    eventType === "customer.card.updated" ||
    eventType === "customer.card.deleted" ||
    eventType === "customer.source.created" ||
    eventType === "customer.source.updated" ||
    eventType === "customer.source.deleted" ||
    eventType === "customer.source.expiring"
  ) {
    await handleCustomerPaymentMethodEvent(
      stripe,
      event.data.object as { customer?: string | Stripe.Customer | null },
    );
    return;
  }

  if (
    eventType === "customer.discount.created" ||
    eventType === "customer.discount.updated" ||
    eventType === "customer.discount.deleted"
  ) {
    const discount = event.data.object as Stripe.Discount;
    const customerId = customerIdFromStripeObject(discount);
    if (customerId) {
      await ensureStripeCustomerLinked(stripe, customerId);
    }
  }
}
