"use client";

import Script from "next/script";

type StripeBuyButtonProps = {
  buyButtonId?: string;
  publishableKey?: string;
};

export function StripeBuyButton({
  buyButtonId = process.env.NEXT_PUBLIC_STRIPE_PRO_BUY_BUTTON_ID,
  publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
}: StripeBuyButtonProps) {
  if (!buyButtonId || !publishableKey) {
    return null;
  }

  return (
    <>
      <Script
        src="https://js.stripe.com/v3/buy-button.js"
        strategy="afterInteractive"
      />
      <stripe-buy-button
        buy-button-id={buyButtonId}
        publishable-key={publishableKey}
      />
    </>
  );
}
