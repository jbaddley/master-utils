/**
 * Creates the Hamlet (e-book) Stripe product for Managed Payments.
 *
 * Usage:
 *   STRIPE_SECRET_KEY=sk_test_... node scripts/create-hamlet-product.mjs
 *
 * Obtain keys from https://dashboard.stripe.com/apikeys
 */
import "dotenv/config";
import Stripe from "stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  console.error(
    "Missing STRIPE_SECRET_KEY. Set it from https://dashboard.stripe.com/apikeys",
  );
  process.exit(1);
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2026-02-25.preview",
});

const product = await stripe.products.create({
  name: "Hamlet (e-book)",
  description: "A Shakespearean tragedy",
  tax_code: "txcd_10103100",
  default_price_data: {
    unit_amount: 1000,
    currency: "usd",
  },
});

const priceId =
  typeof product.default_price === "string"
    ? product.default_price
    : product.default_price?.id;

if (!priceId) {
  console.error("Product created without a default price:", product.id);
  process.exit(1);
}

console.log("Add these to your .env:");
console.log(`STRIPE_HAMLET_PRODUCT_ID=${product.id}`);
console.log(`STRIPE_HAMLET_PRICE_ID=${priceId}`);
