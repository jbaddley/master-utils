import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { LAST_UPDATED, SUPPORT_EMAIL } from "@/lib/legal";

export const metadata: Metadata = buildMetadata({
  title: "Refund, Return & Cancellation Policy",
  description:
    "How refunds, cancellations, and disputes work for Utilio Pro, Business, and digital product purchases.",
  path: "/refund-policy",
});

export default function RefundPolicyPage() {
  return (
    <main className="page">
      <div className="hero">
        <h1>Refund, Return &amp; Cancellation Policy</h1>
        <p className="lede">Last updated: {LAST_UPDATED}</p>
      </div>

      <div className="prose">
        <h2>Subscriptions (Pro &amp; Business)</h2>
        <p>
          You can cancel your Pro or Business subscription at any time from
          your account settings. Cancelling stops future billing immediately,
          and you keep access to paid features until the end of the billing
          period you already paid for.
        </p>
        <p>
          We do not provide prorated refunds for the unused portion of a
          billing period. If you believe you were charged in error — for
          example, a duplicate charge or a charge after you cancelled — email{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> within 14
          days of the charge and we will review it.
        </p>

        <h2>One-time digital purchases</h2>
        <p>
          Digital products (such as the <em>Raising Boston</em> ebook) are
          delivered electronically and are non-returnable once downloaded.
          <strong> All sales of completed digital downloads are final.</strong>
        </p>
        <p>
          If a digital purchase fails to deliver, or the file you received is
          corrupted or doesn&apos;t match the product description, contact us
          at <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> within 14
          days of purchase and we will fix the delivery or issue a refund.
        </p>

        <h2>How to request a refund</h2>
        <p>
          Email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> with
          the email address used at checkout and a brief description of the
          issue. We aim to respond within 2 business days.
        </p>

        <h2>Chargebacks</h2>
        <p>
          We&apos;d rather resolve an issue directly — please contact us
          before opening a dispute with your bank or card issuer so we can
          help quickly.
        </p>
      </div>
    </main>
  );
}
