import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata } from "@/lib/seo";
import {
  BILLING_CURRENCY,
  GOVERNING_LAW,
  LAST_UPDATED,
  LEGAL_ENTITY_NAME,
  SUPPORT_EMAIL,
} from "@/lib/legal";

export const metadata: Metadata = buildMetadata({
  title: "Terms of Service",
  description:
    "The rules for using Utilio's tools, Pro and Business subscriptions, and digital products.",
  path: "/terms",
});

export default function TermsPage() {
  return (
    <main className="page">
      <div className="hero">
        <h1>Terms of Service</h1>
        <p className="lede">Last updated: {LAST_UPDATED}</p>
      </div>

      <div className="prose">
        <h2>1. Who we are</h2>
        <p>
          Utilio is operated by {LEGAL_ENTITY_NAME} (&quot;Utilio,&quot;
          &quot;we,&quot; &quot;us&quot;). By using utilio.solutions (the
          &quot;Site&quot;) or any Utilio subscription, embed, or digital
          product, you agree to these Terms.
        </p>

        <h2>2. Billing currency</h2>
        <p>
          All prices on the Site are billed in <strong>{BILLING_CURRENCY}
          </strong> (US dollars) unless a different currency is explicitly
          stated at checkout. Dollar signs ($) shown anywhere on the Site
          refer to {BILLING_CURRENCY}.
        </p>

        <h2>3. Subscriptions and digital products</h2>
        <p>
          Pro and Business plans are recurring subscriptions billed monthly
          or annually through Stripe. Some products, such as the digital
          ebook download, are one-time purchases. All products sold on the
          Site are digital — no physical goods are shipped.
        </p>
        <p>
          You can cancel a subscription at any time from your account
          settings. Cancellation stops future billing; you keep access until
          the end of the current billing period.
        </p>

        <h2>4. Refunds</h2>
        <p>
          See our{" "}
          <Link href="/refund-policy/">
            Refund, Return, and Cancellation Policy
          </Link>{" "}
          for details on how and when refunds are issued.
        </p>

        <h2>5. Acceptable use</h2>
        <p>
          You agree not to use the Site to process content you do not have
          the right to use, to abuse rate limits or attempt to circumvent
          paywalls, or to use the Site for any unlawful purpose.
        </p>

        <h2>6. Disclaimer and limitation of liability</h2>
        <p>
          The Site and its tools are provided &quot;as is&quot; without
          warranties of any kind. To the maximum extent permitted by law,
          {" "}{LEGAL_ENTITY_NAME} is not liable for any indirect, incidental,
          or consequential damages arising from your use of the Site.
        </p>

        <h2>7. Governing law</h2>
        <p>
          These Terms are governed by the laws of {GOVERNING_LAW}, without
          regard to conflict-of-laws principles. Any disputes will be
          resolved in the courts located in that jurisdiction.
        </p>

        <h2>8. Changes to these Terms</h2>
        <p>
          We may update these Terms from time to time. Continued use of the
          Site after changes take effect constitutes acceptance of the
          revised Terms.
        </p>

        <h2>9. Contact</h2>
        <p>
          Questions about these Terms? Reach us at{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> or visit
          our <Link href="/contact/">Contact page</Link>.
        </p>
      </div>
    </main>
  );
}
