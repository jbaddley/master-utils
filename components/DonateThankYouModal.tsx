"use client";

import { Button } from "@/components/ui/button";

type DonateThankYouModalProps = {
  open: boolean;
  onClose: () => void;
};

export function DonateThankYouModal({ open, onClose }: DonateThankYouModalProps) {
  if (!open) return null;

  return (
    <div className="auth-modal-overlay" onClick={onClose}>
      <div
        className="auth-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "28rem" }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground text-xl leading-none"
          aria-label="Close"
          style={{ position: "absolute" }}
        >
          ×
        </button>

        <h2 className="text-xl font-semibold mb-2">Thank you!</h2>
        <p className="text-sm text-muted-foreground mb-5">
          Your donation means a lot. It helps us continue creating great
          community utilities that anyone can enjoy — privacy-first tools for
          images, audio, video, PDFs, and more.
        </p>

        <Button type="button" className="w-full" onClick={onClose}>
          Continue exploring
        </Button>
      </div>
    </div>
  );
}
