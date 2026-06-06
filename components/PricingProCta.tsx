"use client";

import { UpgradeToProButton } from "@/components/UpgradeToProButton";

export function PricingProCta() {
  const hasBuyButton = Boolean(
    process.env.NEXT_PUBLIC_STRIPE_PRO_BUY_BUTTON_ID &&
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  );
  const monthlyUrl = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK_MONTHLY;
  const annualUrl = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK_ANNUAL;
  const hasPaymentLinks = Boolean(monthlyUrl || annualUrl);

  if (hasBuyButton) {
    return (
      <UpgradeToProButton className="w-full" label="Subscribe to Pro" />
    );
  }

  if (hasPaymentLinks) {
    return (
      <>
        {monthlyUrl ? (
          <a
            href={monthlyUrl}
            className="inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/80 h-9 px-4 text-sm font-medium transition-colors w-full text-center"
          >
            Subscribe monthly — $9/mo
          </a>
        ) : null}
        {annualUrl ? (
          <a
            href={annualUrl}
            className="inline-flex items-center justify-center rounded-lg border border-border bg-background hover:bg-muted hover:text-foreground h-9 px-4 text-sm font-medium transition-colors w-full text-center"
          >
            Subscribe yearly — $79/yr
          </a>
        ) : null}
      </>
    );
  }

  return (
    <button
      disabled
      className="inline-flex items-center justify-center rounded-lg bg-primary/40 text-primary-foreground/60 h-9 px-4 text-sm font-medium w-full cursor-not-allowed"
    >
      Coming soon
    </button>
  );
}
