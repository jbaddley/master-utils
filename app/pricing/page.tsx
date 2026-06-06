import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata } from "@/lib/seo";
import { ManageSubscriptionButton } from "@/components/ManageSubscriptionButton";
import { PricingProCta } from "@/components/PricingProCta";
import { PRO_SUBSCRIPTION_BENEFITS } from "@/lib/pro-plan";
import {
  PRICING_DESCRIPTION,
  PRICING_PRIVACY_FAQ,
} from "@/lib/utilio-messaging";

export const metadata: Metadata = buildMetadata({
  title: "Pricing — Free & Pro plans",
  description: PRICING_DESCRIPTION,
  path: "/pricing",
});

const FREE_FEATURES = [
  "Single-file exports on many tools",
  "Core utilities (convert, compress, resize, crop, SVG, favicon, remove background)",
  "No sign-up required for free tier",
  "Privacy-first — many tools run in your browser",
];

const PRO_FEATURES = [...PRO_SUBSCRIPTION_BENEFITS];

const BUSINESS_FEATURES = [
  "Everything in Pro",
  "Embeddable widget on your domain",
  "White-label (remove our branding)",
  "Usage analytics dashboard",
  "Developer API access",
  "Priority email support",
];

function CheckIcon() {
  return (
    <svg
      className="pricing-feature-check"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M3 8l3.5 3.5L13 4.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function PricingPage() {
  return (
    <main className="page">
      <div className="hero">
        <h1>Simple, transparent pricing</h1>
        <p className="lede">
          Start free — no account needed. Upgrade to Pro when you need batch
          exports and history.
        </p>
      </div>

      <div className="pricing-grid">
        {/* Free tier */}
        <div className="pricing-card">
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
              Free
            </div>
            <div className="flex items-baseline gap-1">
              <span className="pricing-price">$0</span>
              <span className="pricing-period"> to start</span>
            </div>
          </div>

          <ul className="pricing-features" role="list">
            {FREE_FEATURES.map((f) => (
              <li key={f} className="pricing-feature">
                <CheckIcon />
                <span>{f}</span>
              </li>
            ))}
          </ul>

          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-lg border border-border bg-background hover:bg-muted hover:text-foreground h-9 px-4 text-sm font-medium transition-colors w-full text-center"
          >
            Get started free
          </Link>
        </div>

        {/* Pro tier */}
        <div className="pricing-card featured">
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-primary mb-2">
              Pro
            </div>
            <div className="flex items-baseline gap-1">
              <span className="pricing-price">$9</span>
              <span className="pricing-period">/ mo</span>
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              or{" "}
              <span className="text-[#8ef0b5] font-medium">$79 / year</span>{" "}
              <span className="text-xs">(save $29)</span>
            </div>
          </div>

          <ul className="pricing-features" role="list">
            {PRO_FEATURES.map((f) => (
              <li key={f} className="pricing-feature">
                <CheckIcon />
                <span>{f}</span>
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-2">
            <PricingProCta />
          </div>
        </div>
        {/* Business tier */}
        <div className="pricing-card">
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
              Business
            </div>
            <div className="flex items-baseline gap-1">
              <span className="pricing-price">$49</span>
              <span className="pricing-period">/ mo · per domain</span>
            </div>
          </div>

          <ul className="pricing-features" role="list">
            {BUSINESS_FEATURES.map((f) => (
              <li key={f} className="pricing-feature">
                <CheckIcon />
                <span>{f}</span>
              </li>
            ))}
          </ul>

          <Link
            href="/embed"
            className="inline-flex items-center justify-center rounded-lg border border-border bg-background hover:bg-muted hover:text-foreground h-9 px-4 text-sm font-medium transition-colors w-full text-center"
          >
            Get embed code →
          </Link>
        </div>
      </div>

      <ManageSubscriptionButton />

      <div className="prose">
        <h2>Frequently asked questions</h2>
        <div className="faq-item">
          <h3>Do I need an account to use the free tools?</h3>
          <p>
            No. All free tools work instantly in your browser without any
            sign-up.
          </p>
        </div>
        <div className="faq-item">
          <h3>What payment methods are accepted?</h3>
          <p>
            We use Stripe for secure payment processing. All major credit and
            debit cards are accepted.
          </p>
        </div>
        <div className="faq-item">
          <h3>Can I cancel my Pro subscription at any time?</h3>
          <p>
            Yes. You can cancel at any time from your account settings. Your Pro
            access continues until the end of the billing period.
          </p>
        </div>
        <div className="faq-item">
          <h3>Is my data private?</h3>
          <p>{PRICING_PRIVACY_FAQ}</p>
        </div>
      </div>
    </main>
  );
}
