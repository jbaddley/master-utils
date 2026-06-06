"use client";

import { useState, type FormEvent } from "react";
import { useDonation } from "@/context/DonationContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DONATION_PRESET_AMOUNTS_CENTS,
  formatDonationAmount,
  MAX_DONATION_CENTS,
  MIN_DONATION_CENTS,
} from "@/lib/donation";

function parseDollarInput(value: string): number | null {
  const trimmed = value.trim().replace(/^\$/, "");
  if (!trimmed) return null;

  const parsed = Number.parseFloat(trimmed);
  if (!Number.isFinite(parsed)) return null;

  return Math.round(parsed * 100);
}

export function DonateModal() {
  const { donateModalOpen, closeDonateModal } = useDonation();
  const [selectedCents, setSelectedCents] = useState<number>(
    DONATION_PRESET_AMOUNTS_CENTS[1],
  );
  const [customAmount, setCustomAmount] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!donateModalOpen) return null;

  const customCents = parseDollarInput(customAmount);
  const amountCents = useCustom ? customCents : selectedCents;
  const amountValid =
    amountCents !== null &&
    amountCents >= MIN_DONATION_CENTS &&
    amountCents <= MAX_DONATION_CENTS;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!amountValid || amountCents === null) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/stripe/create-donation-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountCents }),
      });
      const data = (await res.json()) as { url?: string; error?: string };

      if (!res.ok || !data.url) {
        throw new Error(data.error ?? "Could not start checkout");
      }

      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
      setLoading(false);
    }
  }

  return (
    <div className="auth-modal-overlay" onClick={closeDonateModal}>
      <div
        className="auth-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "28rem" }}
      >
        <button
          onClick={closeDonateModal}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground text-xl leading-none"
          aria-label="Close"
          style={{ position: "absolute" }}
        >
          ×
        </button>

        <h2 className="text-xl font-semibold mb-1">Support Utilio</h2>
        <p className="text-sm text-muted-foreground mb-5">
          Choose any amount to help us keep building free community utilities
          anyone can enjoy.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-2">
            {DONATION_PRESET_AMOUNTS_CENTS.map((cents) => (
              <Button
                key={cents}
                type="button"
                variant={!useCustom && selectedCents === cents ? "default" : "outline"}
                onClick={() => {
                  setUseCustom(false);
                  setSelectedCents(cents);
                  setError(null);
                }}
              >
                {formatDonationAmount(cents)}
              </Button>
            ))}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="donation-custom-amount">Custom amount (USD)</Label>
            <Input
              id="donation-custom-amount"
              type="text"
              inputMode="decimal"
              placeholder="Enter any amount"
              value={customAmount}
              onChange={(e) => {
                setUseCustom(true);
                setCustomAmount(e.target.value);
                setError(null);
              }}
              onFocus={() => setUseCustom(true)}
              aria-invalid={useCustom && customAmount.length > 0 && !amountValid}
            />
            {useCustom && customAmount.length > 0 && !amountValid ? (
              <p className="text-xs text-destructive" role="alert">
                Enter an amount between {formatDonationAmount(MIN_DONATION_CENTS)}{" "}
                and {formatDonationAmount(MAX_DONATION_CENTS)}.
              </p>
            ) : null}
          </div>

          <Button type="submit" className="w-full" disabled={!amountValid || loading}>
            {loading
              ? "Redirecting…"
              : amountValid && amountCents !== null
                ? `Donate ${formatDonationAmount(amountCents)}`
                : "Donate"}
          </Button>

          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          <p className="text-xs text-muted-foreground text-center">
            Secure checkout powered by Stripe.
          </p>
        </form>
      </div>
    </div>
  );
}
