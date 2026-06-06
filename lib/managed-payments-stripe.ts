import type Stripe from "stripe";
import { HAMLET_EBOOK } from "@/lib/hamlet-ebook";

/** Preview API version required for Managed Payments (see Stripe blueprint). */
export const MANAGED_PAYMENTS_API_VERSION = "2026-02-25.preview";

export const managedPaymentsRequestOptions = {
  apiVersion: MANAGED_PAYMENTS_API_VERSION,
} as Stripe.RequestOptions;

let managedPaymentsStripe: Stripe | null = null;

export async function getManagedPaymentsStripe(): Promise<Stripe> {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }

  if (!managedPaymentsStripe) {
    const { default: StripeClient } = await import("stripe");
    managedPaymentsStripe = new StripeClient(stripeSecretKey);
  }

  return managedPaymentsStripe;
}

export async function createHamletEbookProduct(): Promise<{
  productId: string;
  priceId: string;
}> {
  const stripe = await getManagedPaymentsStripe();

  const product = await stripe.products.create(
    {
      name: HAMLET_EBOOK.name,
      description: HAMLET_EBOOK.description,
      tax_code: HAMLET_EBOOK.taxCode,
      default_price_data: {
        unit_amount: HAMLET_EBOOK.unitAmount,
        currency: HAMLET_EBOOK.currency,
      },
    },
    managedPaymentsRequestOptions,
  );

  const priceId =
    typeof product.default_price === "string"
      ? product.default_price
      : product.default_price?.id;

  if (!priceId) {
    throw new Error("Stripe product was created without a default price");
  }

  return { productId: product.id, priceId };
}
