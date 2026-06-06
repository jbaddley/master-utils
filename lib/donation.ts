export function getDonationLink(): string | undefined {
  return process.env.NEXT_PUBLIC_STRIPE_DONATION_LINK || undefined;
}
