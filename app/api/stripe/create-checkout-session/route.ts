import { NextResponse } from "next/server";
import {
  HAMLET_EBOOK_PRODUCT_KEY,
  MANAGED_PAYMENT_METADATA_KEY,
} from "@/lib/hamlet-ebook";
import {
  getManagedPaymentsStripe,
  managedPaymentsRequestOptions,
} from "@/lib/managed-payments-stripe";

export async function POST() {
  const priceId = process.env.STRIPE_HAMLET_PRICE_ID;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  if (!process.env.STRIPE_SECRET_KEY || !priceId || !siteUrl) {
    return NextResponse.json(
      { error: "Stripe Managed Payments is not configured" },
      { status: 503 },
    );
  }

  try {
    const stripe = await getManagedPaymentsStripe();

    const session = await stripe.checkout.sessions.create(
      {
        line_items: [{ price: priceId, quantity: 1 }],
        mode: "payment",
        managed_payments: { enabled: true },
        success_url: `${siteUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${siteUrl}/checkout/canceled`,
        metadata: {
          [MANAGED_PAYMENT_METADATA_KEY]: HAMLET_EBOOK_PRODUCT_KEY,
          product_id: process.env.STRIPE_HAMLET_PRODUCT_ID ?? "",
        },
      },
      managedPaymentsRequestOptions,
    );

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
