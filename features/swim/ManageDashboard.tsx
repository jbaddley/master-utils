"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { SwimOrgRole } from "@prisma/client";
import { useSwimHref } from "@/hooks/useSwimHref";

type Org = {
  id: string;
  name: string;
  location: string;
  website: string | null;
  slug: string;
  role: SwimOrgRole;
};

export default function ManageDashboard({ orgs }: { orgs: Org[] }) {
  const router = useRouter();
  const { href } = useSwimHref();
  const [showCreate, setShowCreate] = useState(orgs.length === 0);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [website, setWebsite] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function createOrg(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/swim/orgs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, location, website }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push(href(`/swim/manage/org/${data.org.id}/`));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  if (showCreate || orgs.length === 0) {
    return (
      <div className="swim-card">
        <h2>Create your organization</h2>
        <p className="swim-lede" style={{ textAlign: "left", margin: "0 0 1rem" }}>
          Set up the swim club or league that will host meets.
        </p>
        <form onSubmit={createOrg} className="swim-form">
          <div className="swim-form-row">
            <Label htmlFor="name">Organization name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="swim-form-row">
            <Label htmlFor="location">Location</Label>
            <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} required />
          </div>
          <div className="swim-form-row">
            <Label htmlFor="website">Website (optional)</Label>
            <Input id="website" type="url" value={website} onChange={(e) => setWebsite(e.target.value)} />
          </div>
          {error && <p className="swim-error">{error}</p>}
          <Button type="submit" disabled={loading}>{loading ? "Creating…" : "Create organization"}</Button>
        </form>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>Your organizations</h1>
        <Button variant="outline" onClick={() => setShowCreate(true)}>New organization</Button>
      </div>
      <div className="swim-grid-2">
        {orgs.map((org) => (
          <Link key={org.id} href={href(`/swim/manage/org/${org.id}/`)} className="swim-card" style={{ textDecoration: "none", color: "inherit" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
              <h2>{org.name}</h2>
              <Badge variant="secondary">{org.role}</Badge>
            </div>
            <p className="swim-meet-meta">{org.location}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
