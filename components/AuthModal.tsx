"use client";

import { useState, type FormEvent } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function GoogleIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332Z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 6.294C4.672 4.169 6.656 3.58 9 3.58Z"
        fill="#EA4335"
      />
    </svg>
  );
}

export function AuthModal() {
  const { authModalOpen, closeAuthModal, signIn, signUp, signInWithGoogle } =
    useAuth();
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!authModalOpen) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      if (tab === "signin") {
        await signIn(email, password);
      } else {
        await signUp(email, password);
      }
      closeAuthModal();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogle() {
    setError("");
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred.",
      );
    }
  }

  return (
    <div className="auth-modal-overlay" onClick={closeAuthModal}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        {/* Close button */}
        <button
          onClick={closeAuthModal}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground text-xl leading-none"
          aria-label="Close"
          style={{ position: "absolute" }}
        >
          ×
        </button>

        {/* Tabs */}
        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab${tab === "signin" ? " active" : ""}`}
            onClick={() => {
              setTab("signin");
              setError("");
            }}
          >
            Sign in
          </button>
          <button
            type="button"
            className={`auth-tab${tab === "signup" ? " active" : ""}`}
            onClick={() => {
              setTab("signup");
              setError("");
            }}
          >
            Create account
          </button>
        </div>

        {/* Error */}
        {error && <div className="error mb-4">{error}</div>}

        {/* Email / password form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="auth-email">Email</Label>
            <Input
              id="auth-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="auth-password">Password</Label>
            <Input
              id="auth-password"
              type="password"
              autoComplete={
                tab === "signin" ? "current-password" : "new-password"
              }
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting
              ? "Please wait…"
              : tab === "signin"
                ? "Sign in"
                : "Create account"}
          </Button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 border-t border-border" />
          <span className="text-xs text-muted-foreground">or</span>
          <div className="flex-1 border-t border-border" />
        </div>

        {/* Google OAuth */}
        <Button
          type="button"
          variant="outline"
          className="w-full gap-2"
          onClick={handleGoogle}
        >
          <GoogleIcon />
          Continue with Google
        </Button>
      </div>
    </div>
  );
}
