import { prisma } from "@/lib/prisma";

export const GOAL_CENTS = 1_000_000;
/** Pre-campaign funds already committed before tracked Stripe donations. */
export const BASE_RAISED_CENTS = 120_000;
export const BETA_READ_URL = "https://betaread.heyjustwrite.com/raising-boston";
export const PROFESSIONALS_URL =
  "https://betaread.heyjustwrite.com/raising-boston/professionals";
export const PUBLISHERS_URL =
  "https://betaread.heyjustwrite.com/raising-boston/publishers";

export const PUBLISHING_BUDGET = [
  { item: "Professional editor", budgetCents: 300_000 },
  { item: "Cover artist", budgetCents: 250_000 },
  { item: "Audiobook narrator", budgetCents: 350_000 },
  { item: "Production & publishing", budgetCents: 100_000 },
] as const;

export type RaisingBostonProgress = {
  raisedCents: number;
  goalCents: number;
  remainingCents: number;
  percent: number;
  recentDonations: { amountCents: number; createdAt: Date }[];
};

export function formatUsd(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export async function getRaisingBostonProgress(): Promise<RaisingBostonProgress> {
  const empty: RaisingBostonProgress = {
    raisedCents: BASE_RAISED_CENTS,
    goalCents: GOAL_CENTS,
    remainingCents: Math.max(0, GOAL_CENTS - BASE_RAISED_CENTS),
    percent: Math.min(100, Math.round((BASE_RAISED_CENTS / GOAL_CENTS) * 100)),
    recentDonations: [],
  };

  try {
    const [aggregate, recentDonations] = await Promise.all([
      prisma.raisingBostonDonation.aggregate({ _sum: { amountCents: true } }),
      prisma.raisingBostonDonation.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { amountCents: true, createdAt: true },
      }),
    ]);

    const raisedCents = BASE_RAISED_CENTS + (aggregate._sum.amountCents ?? 0);
    const remainingCents = Math.max(0, GOAL_CENTS - raisedCents);
    const percent = Math.min(100, Math.round((raisedCents / GOAL_CENTS) * 100));

    return {
      raisedCents,
      goalCents: GOAL_CENTS,
      remainingCents,
      percent,
      recentDonations,
    };
  } catch {
    return empty;
  }
}

export function getDonationLink(): string | undefined {
  return process.env.NEXT_PUBLIC_STRIPE_DONATION_LINK || undefined;
}

export function isRaisingBostonDonation(metadata: Record<string, string> | null): boolean {
  if (metadata?.purpose === "raising-boston") return true;

  const productId = process.env.STRIPE_DONATION_PRODUCT_ID;
  return Boolean(productId && metadata?.product_id === productId);
}
