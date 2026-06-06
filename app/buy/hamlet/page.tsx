import type { Metadata } from "next";
import { HamletCheckoutButton } from "@/components/HamletCheckoutButton";
import { HAMLET_EBOOK } from "@/lib/hamlet-ebook";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: `Buy ${HAMLET_EBOOK.name}`,
  description: HAMLET_EBOOK.description,
  path: "/buy/hamlet",
});

export default function BuyHamletPage() {
  const configured = Boolean(
    process.env.STRIPE_SECRET_KEY && process.env.STRIPE_HAMLET_PRICE_ID,
  );

  return (
    <main className="page">
      <div className="hero">
        <h1>{HAMLET_EBOOK.name}</h1>
        <p className="lede">{HAMLET_EBOOK.description}</p>
      </div>

      <div className="prose max-w-xl">
        <p>
          Digital download sold through Stripe Managed Payments. Tax is calculated
          automatically based on the billing address you enter at checkout.
        </p>
        <p>
          Test card: <code>4242 4242 4242 4242</code> with any future expiration
          and CVC.
        </p>
      </div>

      {configured ? (
        <HamletCheckoutButton />
      ) : (
        <p className="text-sm text-muted-foreground">
          Checkout is not configured yet. Create the product and set{" "}
          <code>STRIPE_HAMLET_PRICE_ID</code> in your environment.
        </p>
      )}
    </main>
  );
}
