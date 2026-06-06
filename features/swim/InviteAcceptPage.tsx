"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession, signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { useSwimHref } from "@/hooks/useSwimHref";

export default function InviteAcceptPage({ token }: { token: string }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { href } = useSwimHref();
  const [invite, setInvite] = useState<{ email: string; role: string; orgName: string } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/swim/invites/${token}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setInvite(d.invite);
      });
  }, [token]);

  async function accept() {
    const res = await fetch(`/api/swim/invites/${token}`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
      return;
    }
    router.push(href(`/swim/manage/org/${data.orgId}/`));
  }

  if (error && !invite) {
    return (
      <div className="swim-card" style={{ maxWidth: 420, margin: "2rem auto" }}>
        <p className="swim-error">{error}</p>
        <Link href={href("/swim/")}>Home</Link>
      </div>
    );
  }

  if (!invite) return <p style={{ padding: "2rem" }}>Loading…</p>;

  return (
    <div className="swim-card" style={{ maxWidth: 420, margin: "2rem auto" }}>
      <h2>Join {invite.orgName}</h2>
      <p className="swim-meet-meta">
        You&apos;ve been invited as <strong>{invite.role}</strong> for {invite.email}.
      </p>
      {status === "loading" ? (
        <p>Loading session…</p>
      ) : session?.user ? (
        <>
          <p>Signed in as {session.user.email}</p>
          {error && <p className="swim-error">{error}</p>}
          <Button onClick={accept} className="mt-3">Accept invitation</Button>
        </>
      ) : (
        <>
          <p className="swim-meet-meta">Sign in with the invited email to continue.</p>
          <Button
            className="mt-3"
            onClick={() =>
              signIn(undefined, {
                callbackUrl: href(`/swim/invite/${token}/`),
              })
            }
          >
            Sign in
          </Button>
          <p style={{ marginTop: "0.75rem" }}>
            <Link href={href(`/swim/login/?callbackUrl=${encodeURIComponent(href(`/swim/invite/${token}/`))}`)}>
              Create account or use magic link
            </Link>
          </p>
        </>
      )}
    </div>
  );
}
