import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Thanks for purchasing",
  description: "Your payment was successful.",
  path: "/checkout/success",
});

export default function CheckoutSuccessPage() {
  return (
    <main className="page">
      <div className="hero">
        <h1>Thanks for purchasing!</h1>
        <p className="lede">
          We appreciate your business. Your payment was processed through Stripe
          Managed Payments.
        </p>
      </div>

      <p>
        <Link href="/buy/hamlet">Back to Hamlet (e-book)</Link>
      </p>
    </main>
  );
}
