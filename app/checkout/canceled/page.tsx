import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Checkout canceled",
  description: "Your checkout was canceled.",
  path: "/checkout/canceled",
});

export default function CheckoutCanceledPage() {
  return (
    <main className="page">
      <div className="hero">
        <h1>Checkout canceled</h1>
        <p className="lede">
          Not ready to purchase yet? No problem — we&apos;ll be here when you are.
        </p>
      </div>

      <p>
        <Link href="/buy/hamlet">Return to checkout</Link>
      </p>
    </main>
  );
}
