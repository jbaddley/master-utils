import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

  if (!stripeSecretKey) {
    return NextResponse.json(
      { error: "Stripe is not configured" },
      { status: 503 },
    );
  }

  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Ensure user exists in our DB (side-effect: validates the session user)
  void prisma;

  // Lazy-import Stripe to avoid module-level initialization errors
  const { default: Stripe } = await import("stripe");
  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: "2026-05-27.dahlia",
  });

  const customers = await stripe.customers.list({
    email: session.user.email,
    limit: 1,
  });
  const customer = customers.data[0];
  if (!customer) {
    return NextResponse.json(
      { error: "No subscription found" },
      { status: 404 },
    );
  }

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: customer.id,
    return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/pricing`,
  });

  return NextResponse.json({ url: portalSession.url });
}
