import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata } from "@/lib/seo";
import { ManageSubscriptionButton } from "@/components/ManageSubscriptionButton";

export const metadata: Metadata = buildMetadata({
  title: "Pricing — Free & Pro plans",
  description:
    "Image Tools is free forever for single-file exports. Upgrade to Pro for batch processing, export history, and priority processing.",
  path: "/pricing",
});

const FREE_FEATURES = [
  "Unlimited single-file exports",
  "All 7+ tools (convert, compress, resize, crop, SVG, favicon, remove background)",
  "No sign-up required",
  "100% client-side — your files never leave your browser",
];

const PRO_FEATURES = [
  "Everything in Free",
  "Batch processing (up to 50 files at once)",
  "30-day export history",
  "No ads",
  "Priority processing",
];

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
  const monthlyUrl = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK_MONTHLY;
  const annualUrl = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK_ANNUAL;
  const hasStripe = Boolean(monthlyUrl || annualUrl);

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
              <span className="pricing-period">/ forever</span>
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
            {hasStripe ? (
              <>
                {monthlyUrl && (
                  <a
                    href={monthlyUrl}
                    className="inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/80 h-9 px-4 text-sm font-medium transition-colors w-full text-center"
                  >
                    Subscribe monthly — $9/mo
                  </a>
                )}
                {annualUrl && (
                  <a
                    href={annualUrl}
                    className="inline-flex items-center justify-center rounded-lg border border-border bg-background hover:bg-muted hover:text-foreground h-9 px-4 text-sm font-medium transition-colors w-full text-center"
                  >
                    Subscribe yearly — $79/yr
                  </a>
                )}
              </>
            ) : (
              <button
                disabled
                className="inline-flex items-center justify-center rounded-lg bg-primary/40 text-primary-foreground/60 h-9 px-4 text-sm font-medium w-full cursor-not-allowed"
              >
                Coming soon
              </button>
            )}
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
          <p>
            All image processing happens locally in your browser — your files
            are never uploaded to our servers.
          </p>
        </div>
      </div>
    </main>
  );
}
