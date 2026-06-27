import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata } from "@/lib/seo";
import { LAST_UPDATED, LEGAL_ENTITY_NAME, SUPPORT_EMAIL } from "@/lib/legal";

export const metadata: Metadata = buildMetadata({
  title: "Privacy Policy",
  description: "How Utilio collects, uses, and protects your data.",
  path: "/privacy-policy",
});

export default function PrivacyPolicyPage() {
  return (
    <main className="page">
      <div className="hero">
        <h1>Privacy Policy</h1>
        <p className="lede">Last updated: {LAST_UPDATED}</p>
      </div>

      <div className="prose">
        <h2>Overview</h2>
        <p>
          Utilio ({LEGAL_ENTITY_NAME}) is built around a privacy-first
          principle: many tools process your files entirely in your browser
          and never upload them to our servers. Each tool page states
          whether processing happens locally or on our servers.
        </p>

        <h2>Information we collect</h2>
        <p>
          If you create an account, we collect your email address and
          authentication details. If you subscribe to Pro or Business, Stripe
          processes your payment — we receive your subscription status and
          billing email, but Utilio never stores your full card number.
        </p>
        <p>
          For tools that require server-side or AI processing, the file you
          submit is sent to our servers (or a third-party AI provider) only
          to perform that operation, and is not used to train models or
          shared for advertising.
        </p>

        <h2>Cookies and analytics</h2>
        <p>
          We use essential cookies for authentication and session management,
          and basic analytics to understand which tools are used most.
        </p>

        <h2>How we use your data</h2>
        <p>
          We use your data to provide the Site, process payments, respond to
          support requests, and improve our tools. We do not sell your
          personal data.
        </p>

        <h2>Data retention</h2>
        <p>
          Files processed server-side are deleted after processing completes
          unless you explicitly save them to your account history (a Pro
          feature). Account data is retained until you delete your account.
        </p>

        <h2>Your choices</h2>
        <p>
          You can request deletion of your account and associated data at any
          time by emailing{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
        </p>

        <h2>Contact</h2>
        <p>
          Questions about this policy? Email{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> or visit our{" "}
          <Link href="/contact/">Contact page</Link>.
        </p>
      </div>
    </main>
  );
}
