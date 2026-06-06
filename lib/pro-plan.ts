export const PRO_SUBSCRIPTION_BENEFITS = [
  "All AI tools unlocked — chat, summarize, translate, rewrite, grammar, extract, Q&A, and more",
  "Advanced AI features — artistic QR codes, AI upscale, denoise, and image-to-text",
  "Batch processing — work on up to 50 files at once",
  "30-day export history and dynamic QR codes",
  "Developer API access with 10,000 requests per day (vs 100 on Free)",
  "Larger uploads — up to 100 MB per file",
  "Priority processing and no ads",
] as const;

export function dailyLimitForPlan(plan: string): number {
  return plan === "pro" ? 10_000 : 100;
}

export function isProSubscriptionStatus(
  status: string | null | undefined,
): boolean {
  return status === "active" || status === "trialing" || status === "past_due";
}

export function planFromSubscriptionStatus(
  status: string | null | undefined,
): "pro" | "free" {
  return isProSubscriptionStatus(status) ? "pro" : "free";
}
