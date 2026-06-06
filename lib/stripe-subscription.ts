import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { dailyLimitForPlan, planFromSubscriptionStatus } from "@/lib/pro-plan";

async function syncApiKeyLimitsForUser(userId: string, plan: string) {
  await prisma.apiKey.updateMany({
    where: { userId, active: true },
    data: { dailyLimit: dailyLimitForPlan(plan) },
  });
}

async function applyPlanToUser(
  userId: string,
  plan: "pro" | "free",
  stripeCustomerId?: string | null,
  stripeSubscriptionId?: string | null,
) {
  await prisma.user.update({
    where: { id: userId },
    data: {
      plan,
      ...(stripeCustomerId !== undefined ? { stripeCustomerId } : {}),
      ...(stripeSubscriptionId !== undefined ? { stripeSubscriptionId } : {}),
    },
  });
  await syncApiKeyLimitsForUser(userId, plan);
}

function customerIdFromReference(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null | undefined,
): string | null {
  if (!customer) return null;
  return typeof customer === "string" ? customer : customer.id;
}

export async function linkStripeCustomerToUser(
  stripe: Stripe,
  customer: Stripe.Customer,
) {
  if (customer.deleted || !customer.email) return;

  const user = await prisma.user.findUnique({
    where: { email: customer.email },
    select: { id: true, stripeCustomerId: true },
  });
  if (!user) return;
  if (user.stripeCustomerId && user.stripeCustomerId !== customer.id) return;

  await prisma.user.update({
    where: { id: user.id },
    data: { stripeCustomerId: customer.id },
  });
}

export async function ensureStripeCustomerLinked(
  stripe: Stripe,
  customerId: string,
) {
  const customer = await stripe.customers.retrieve(customerId);
  if (customer.deleted) return;
  await linkStripeCustomerToUser(stripe, customer);
}

export async function handleDeletedStripeCustomer(
  stripe: Stripe,
  customerId: string,
) {
  const user = await findUserForStripeCustomer(stripe, customerId);
  if (!user) return;

  await applyPlanToUser(user.id, "free", null, null);
}

export function customerIdFromStripeObject(
  object: { customer?: string | Stripe.Customer | Stripe.DeletedCustomer | null },
): string | null {
  return customerIdFromReference(object.customer);
}

async function findUserForStripeCustomer(
  stripe: Stripe,
  customerId: string,
  emailHint?: string | null,
) {
  const byCustomerId = await prisma.user.findFirst({
    where: { stripeCustomerId: customerId },
    select: { id: true },
  });
  if (byCustomerId) return byCustomerId;

  if (emailHint) {
    const byEmail = await prisma.user.findUnique({
      where: { email: emailHint },
      select: { id: true },
    });
    if (byEmail) return byEmail;
  }

  const customer = await stripe.customers.retrieve(customerId);
  if (customer.deleted || !customer.email) return null;

  return prisma.user.findUnique({
    where: { email: customer.email },
    select: { id: true },
  });
}

export async function syncUserPlanFromSubscription(
  stripe: Stripe,
  subscription: Stripe.Subscription,
) {
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  const user = await findUserForStripeCustomer(stripe, customerId);
  if (!user) return;

  const plan = planFromSubscriptionStatus(subscription.status);
  await applyPlanToUser(
    user.id,
    plan,
    customerId,
    subscription.id,
  );
}

export async function syncUserPlanFromCheckoutSession(
  stripe: Stripe,
  session: Stripe.Checkout.Session,
) {
  if (session.mode !== "subscription") return;

  const customerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer?.id;

  if (!customerId) return;

  const emailHint = session.customer_details?.email ?? session.customer_email;
  const user = await findUserForStripeCustomer(stripe, customerId, emailHint);
  if (!user) return;

  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id;

  let plan: "pro" | "free" = "pro";
  if (subscriptionId) {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    plan = planFromSubscriptionStatus(subscription.status);
    await applyPlanToUser(user.id, plan, customerId, subscription.id);
    return;
  }

  if (session.payment_status === "paid") {
    await applyPlanToUser(user.id, "pro", customerId, null);
  }
}

export async function downgradeUserByCustomerId(
  stripe: Stripe,
  customerId: string,
) {
  const user = await findUserForStripeCustomer(stripe, customerId);
  if (!user) return;

  await applyPlanToUser(user.id, "free", customerId, null);
}
