import { NextResponse } from "next/server";
import { createHamletEbookProduct } from "@/lib/managed-payments-stripe";

/**
 * One-time setup: creates the Hamlet e-book product in Stripe with an eligible tax code.
 * Run once, then persist STRIPE_HAMLET_PRODUCT_ID and STRIPE_HAMLET_PRICE_ID in your env.
 */
export async function POST(req: Request) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { error: "STRIPE_SECRET_KEY is not configured" },
      { status: 503 },
    );
  }

  const setupToken = process.env.STRIPE_SETUP_TOKEN;
  if (setupToken) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${setupToken}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const { productId, priceId } = await createHamletEbookProduct();

    return NextResponse.json({
      productId,
      priceId,
      env: {
        STRIPE_HAMLET_PRODUCT_ID: productId,
        STRIPE_HAMLET_PRICE_ID: priceId,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create product";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
