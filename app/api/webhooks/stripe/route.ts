import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeSecretKey || !webhookSecret) {
    return NextResponse.json(
      { error: "Stripe is not configured" },
      { status: 503 },
    );
  }

  // Lazy-import Stripe to avoid module-level initialization errors
  const { default: Stripe } = await import("stripe");
  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: "2026-05-27.dahlia",
  });

  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 },
    );
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch {
    return NextResponse.json(
      { error: "Webhook signature verification failed" },
      { status: 400 },
    );
  }

  if (
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated"
  ) {
    const sub = event.data.object as Stripe.Subscription;
    const customerId = sub.customer as string;
    const plan = sub.status === "active" ? "pro" : "free";

    const customer = await stripe.customers.retrieve(customerId);
    if (!customer.deleted && customer.email) {
      await prisma.user.updateMany({
        where: { email: customer.email },
        data: { plan },
      });
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription;
    const customerId = sub.customer as string;
    const customer = await stripe.customers.retrieve(customerId);
    if (!customer.deleted && customer.email) {
      await prisma.user.updateMany({
        where: { email: customer.email },
        data: { plan: "free" },
      });
    }
  }

  return NextResponse.json({ received: true });
}
