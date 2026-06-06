import { NextRequest, NextResponse } from "next/server";
import {
  getDonationProductId,
  MAX_DONATION_CENTS,
  MIN_DONATION_CENTS,
} from "@/lib/donation";

export async function POST(req: NextRequest) {
  const productId = getDonationProductId();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  if (!process.env.STRIPE_SECRET_KEY || !productId || !siteUrl) {
    return NextResponse.json(
      { error: "Donations are not configured" },
      { status: 503 },
    );
  }

  let body: { amountCents?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const amountCents = body.amountCents;
  if (typeof amountCents !== "number" || !Number.isInteger(amountCents)) {
    return NextResponse.json(
      { error: "amountCents must be an integer" },
      { status: 400 },
    );
  }

  if (amountCents < MIN_DONATION_CENTS || amountCents > MAX_DONATION_CENTS) {
    return NextResponse.json(
      {
        error: `Amount must be between $${MIN_DONATION_CENTS / 100} and $${MAX_DONATION_CENTS / 100}`,
      },
      { status: 400 },
    );
  }

  try {
    const { default: Stripe } = await import("stripe");
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-05-27.dahlia",
    });

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product: productId,
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      success_url: `${siteUrl}/?donated=1`,
      cancel_url: `${siteUrl}/`,
      metadata: {
        purpose: "donation",
        product_id: productId,
      },
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Checkout session was created without a URL" },
        { status: 500 },
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create checkout session";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
