"use client";

import { useAuth } from "@/context/AuthContext";
import { StripeBuyButton } from "@/components/StripeBuyButton";
import { ManageSubscriptionButton } from "@/components/ManageSubscriptionButton";
import { Button } from "@/components/ui/button";
import { PRO_SUBSCRIPTION_BENEFITS } from "@/lib/pro-plan";

function CheckIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="shrink-0 text-primary"
    >
      <path
        d="M3 8l3.5 3.5L13 4.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SubscribeModal() {
  const {
    subscribeModalOpen,
    closeSubscribeModal,
    openAuthModal,
    user,
    isPro,
    loading,
  } = useAuth();

  const buyButtonConfigured = Boolean(
    process.env.NEXT_PUBLIC_STRIPE_PRO_BUY_BUTTON_ID &&
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  );

  if (!subscribeModalOpen) return null;

  return (
    <div className="auth-modal-overlay" onClick={closeSubscribeModal}>
      <div
        className="auth-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "28rem" }}
      >
        <button
          onClick={closeSubscribeModal}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground text-xl leading-none"
          aria-label="Close"
          style={{ position: "absolute" }}
        >
          ×
        </button>

        <h2 className="text-xl font-semibold mb-1">Upgrade to Pro</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Unlock every AI tool, advanced features, and higher request limits.
        </p>

        <ul className="flex flex-col gap-2.5 mb-5" role="list">
          {PRO_SUBSCRIPTION_BENEFITS.map((benefit) => (
            <li key={benefit} className="flex items-start gap-2 text-sm">
              <CheckIcon />
              <span>{benefit}</span>
            </li>
          ))}
        </ul>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : !user ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Sign in first so your subscription is linked to your account.
            </p>
            <Button
              className="w-full"
              onClick={() => {
                closeSubscribeModal();
                openAuthModal();
              }}
            >
              Sign in to subscribe
            </Button>
          </div>
        ) : isPro ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              You already have Pro. Manage billing below.
            </p>
            <ManageSubscriptionButton />
          </div>
        ) : buyButtonConfigured ? (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-muted-foreground">
              Use the same email as your Utilio account ({user.email}) at
              checkout so your plan updates automatically.
            </p>
            <StripeBuyButton />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Subscriptions are not configured yet. Set{" "}
            <code>NEXT_PUBLIC_STRIPE_PRO_BUY_BUTTON_ID</code> in your
            environment.
          </p>
        )}
      </div>
    </div>
  );
}
