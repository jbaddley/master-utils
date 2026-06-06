export const HAMLET_EBOOK = {
  name: "Hamlet (e-book)",
  description: "A Shakespearean tragedy",
  taxCode: "txcd_10103100",
  unitAmount: 1000,
  currency: "usd",
} as const;

export const MANAGED_PAYMENT_METADATA_KEY = "managed_payment";
export const HAMLET_EBOOK_PRODUCT_KEY = "hamlet-ebook";

export function isHamletManagedPayment(
  metadata: Record<string, string> | null | undefined,
): boolean {
  if (!metadata) return false;
  if (metadata[MANAGED_PAYMENT_METADATA_KEY] === HAMLET_EBOOK_PRODUCT_KEY) {
    return true;
  }

  const productId = process.env.STRIPE_HAMLET_PRODUCT_ID;
  return Boolean(productId && metadata.product_id === productId);
}
