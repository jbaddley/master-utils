import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { LEGAL_ENTITY_NAME, SUPPORT_EMAIL } from "@/lib/legal";

export const metadata: Metadata = buildMetadata({
  title: "Contact Us",
  description: "Get in touch with Utilio support.",
  path: "/contact",
});

export default function ContactPage() {
  return (
    <main className="page">
      <div className="hero">
        <h1>Contact Us</h1>
        <p className="lede">
          Have a question about an order, a subscription, or a tool? We
          respond to every email within 2 business days.
        </p>
      </div>

      <div className="prose">
        <h2>Customer support email</h2>
        <p>
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
        </p>

        <h2>Business</h2>
        <p>
          Utilio is operated by {LEGAL_ENTITY_NAME}. For billing questions,
          include the email address used at checkout so we can find your
          order quickly.
        </p>
      </div>
    </main>
  );
}
