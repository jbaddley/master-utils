"use client";

import { useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SwimLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const swimBase = process.env.NEXT_PUBLIC_SWIM_URL?.replace(/\/$/, "") ?? "";
  const oauthCallbackUrl =
    searchParams.get("callbackUrl") ??
    (swimBase ? `${swimBase}/manage/` : "/swim/manage/");
  const [tab, setTab] = useState<"signin" | "signup" | "magic">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCredentials(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (tab === "signup") {
        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Sign up failed");
      }
      const result = await signIn("credentials", { email, password, redirect: false });
      if (result?.error) throw new Error("Invalid email or password");
      router.push("/manage/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  async function handleMagicLink(e: FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const result = await signIn("email", { email, redirect: false, callbackUrl: oauthCallbackUrl });
      if (result?.error) throw new Error("Could not send magic link");
      setMessage("Check your email for a sign-in link.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="swim-card" style={{ maxWidth: 420, margin: "2rem auto" }}>
      <h2>Sign in to Utilio Swim</h2>
      <div className="swim-tabs-list">
        {(["signin", "signup", "magic"] as const).map((t) => (
          <button
            key={t}
            type="button"
            className={`swim-tab ${tab === t ? "swim-tab-active" : ""}`}
            onClick={() => setTab(t)}
          >
            {t === "signin" ? "Sign in" : t === "signup" ? "Sign up" : "Magic link"}
          </button>
        ))}
      </div>

      {tab === "magic" ? (
        <form onSubmit={handleMagicLink} className="swim-form">
          <div className="swim-form-row">
            <Label htmlFor="magic-email">Email</Label>
            <Input id="magic-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          {error && <p className="swim-error">{error}</p>}
          {message && <p className="swim-success">{message}</p>}
          <Button type="submit" disabled={loading}>{loading ? "Sending…" : "Send magic link"}</Button>
        </form>
      ) : (
        <form onSubmit={handleCredentials} className="swim-form">
          <div className="swim-form-row">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="swim-form-row">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {error && <p className="swim-error">{error}</p>}
          <Button type="submit" disabled={loading}>
            {loading ? "…" : tab === "signin" ? "Sign in" : "Create account"}
          </Button>
        </form>
      )}

      <div style={{ marginTop: "1rem" }}>
        <Button variant="outline" className="w-full" onClick={() => signIn("google", { callbackUrl: oauthCallbackUrl })}>
          Continue with Google
        </Button>
      </div>

      <p style={{ marginTop: "1rem", fontSize: "0.85rem" }}>
        <Link href="/swim/">← Back to Swim home</Link>
      </p>
    </div>
  );
}
