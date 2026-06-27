import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { LAST_UPDATED, SUPPORT_EMAIL } from "@/lib/legal";

export const metadata: Metadata = buildMetadata({
  title: "Shipping & Delivery Policy",
  description:
    "Utilio sells digital products only. Here's how delivery works for subscriptions and digital downloads.",
  path: "/shipping-policy",
});

export default function ShippingPolicyPage() {
  return (
    <main className="page">
      <div className="hero">
        <h1>Shipping &amp; Delivery Policy</h1>
        <p className="lede">Last updated: {LAST_UPDATED}</p>
      </div>

      <div className="prose">
        <h2>No physical goods</h2>
        <p>
          Utilio sells only digital products: software subscriptions (Pro and
          Business plans), an embeddable widget license, and digital
          downloads (such as the <em>Raising Boston</em> ebook). We do not
          ship any physical items, and no shipping costs apply.
        </p>

        <h2>Delivery timing</h2>
        <p>
          Subscription access is granted immediately after a successful
          Stripe payment. Digital downloads (such as ebooks) are available to
          download right away from your account or the checkout success page.
        </p>

        <h2>International availability</h2>
        <p>
          Because all products are delivered electronically, there are no
          customs, duties, or international shipping restrictions. Pricing
          and tax are calculated at checkout based on your billing location.
        </p>

        <h2>Delivery issues</h2>
        <p>
          If you completed a purchase but did not receive access or a
          download link, email{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> and we will
          resolve it promptly.
        </p>
      </div>
    </main>
  );
}
