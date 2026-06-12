import { NextRequest, NextResponse } from "next/server";
import { handleStripeWebhookEvent } from "@/lib/stripe-webhook-handlers";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeSecretKey || !webhookSecret) {
    return NextResponse.json(
      { error: "Stripe is not configured" },
      { status: 503 },
    );
  }

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

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Stripe webhook signature verification failed:", message);
    return NextResponse.json(
      { error: "Webhook signature verification failed" },
      { status: 400 },
    );
  }

  try {
    await handleStripeWebhookEvent(stripe, event);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Webhook handler failed";
    console.error(`Stripe webhook ${event.type} failed:`, message, error);
    return NextResponse.json({ error: message }, { status: 500 });
  }

  console.log(`Stripe webhook ${event.type} processed successfully`);
  return NextResponse.json({ received: true });
}
