export const DONATION_PRESET_AMOUNTS_CENTS = [500, 1000, 2500, 5000] as const;

export const MIN_DONATION_CENTS = 100;
export const MAX_DONATION_CENTS = 1_000_000;

export function getDonationProductId(): string | undefined {
  return (
    process.env.DONATION_PRODUCT_ID ||
    process.env.STRIPE_DONATION_PRODUCT_ID ||
    undefined
  );
}

/** @deprecated Use checkout via DonateButton instead. */
export function getDonationLink(): string | undefined {
  return process.env.NEXT_PUBLIC_STRIPE_DONATION_LINK || undefined;
}

export function formatDonationAmount(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}
