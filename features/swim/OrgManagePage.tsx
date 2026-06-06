"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { SwimMeet, SwimOrgInvite, SwimOrgRole, SwimOrganization } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable } from "./components/DataTable";
import type { ColumnDef } from "@tanstack/react-table";

type Props = {
  org: SwimOrganization;
  role: SwimOrgRole;
  meets: SwimMeet[];
  invites: SwimOrgInvite[];
};

export default function OrgManagePage({ org, role, meets: initialMeets, invites: initialInvites }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<"meets" | "invites">("meets");
  const [meets, setMeets] = useState(initialMeets);
  const [invites, setInvites] = useState(initialInvites);
  const [inviteEmails, setInviteEmails] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "manager">("manager");
  const [error, setError] = useState("");
  const [meetForm, setMeetForm] = useState({ name: "", startsAt: "", location: org.location });

  const isAdmin = role === "admin";
  const baseUrl = typeof window !== "undefined" ? `${window.location.origin}/swim` : "/swim";

  async function createMeet(e: FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch(`/api/swim/orgs/${org.id}/meets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(meetForm),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
      return;
    }
    router.push(`/swim/manage/org/${org.id}/meets/${data.meet.id}/`);
  }

  async function sendInvites(e: FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch(`/api/swim/orgs/${org.id}/invites`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emails: inviteEmails, role: inviteRole, sendEmail: true }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
      return;
    }
    setInviteEmails("");
    const refreshed = await fetch(`/api/swim/orgs/${org.id}/invites`);
    const j = await refreshed.json();
    setInvites(j.invites);
  }

  async function updateInviteRole(id: string, newRole: "admin" | "manager") {
    await fetch(`/api/swim/orgs/${org.id}/invites/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    router.refresh();
  }

  async function revokeInvite(id: string) {
    await fetch(`/api/swim/orgs/${org.id}/invites/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "revoked" }),
    });
    setInvites((prev) => prev.map((i) => (i.id === id ? { ...i, status: "revoked" } : i)));
  }

  const inviteColumns: ColumnDef<SwimOrgInvite>[] = [
    { accessorKey: "email", header: "Email" },
    { accessorKey: "role", header: "Role" },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <Badge variant="secondary">{row.original.status}</Badge>,
    },
    {
      id: "link",
      header: "Invite link",
      cell: ({ row }) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigator.clipboard.writeText(`${baseUrl}/invite/${row.original.token}/`)}
        >
          Copy link
        </Button>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) =>
        isAdmin && row.original.status === "pending" ? (
          <div style={{ display: "flex", gap: 4 }}>
            <Select
              value={row.original.role}
              onValueChange={(v) => updateInviteRole(row.original.id, v as "admin" | "manager")}
            >
              <SelectTrigger className="h-7 w-24"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">admin</SelectItem>
                <SelectItem value="manager">manager</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="destructive" size="sm" onClick={() => revokeInvite(row.original.id)}>Revoke</Button>
          </div>
        ) : null,
    },
  ];

  return (
    <div>
      <div className="swim-meet-header">
        <h1>{org.name}</h1>
        <p className="swim-meet-meta">{org.location}{org.website ? ` · ${org.website}` : ""}</p>
      </div>

      <div className="swim-tabs-list">
        <button type="button" className={`swim-tab ${tab === "meets" ? "swim-tab-active" : ""}`} onClick={() => setTab("meets")}>Meets</button>
        {isAdmin && (
          <button type="button" className={`swim-tab ${tab === "invites" ? "swim-tab-active" : ""}`} onClick={() => setTab("invites")}>Invites</button>
        )}
      </div>

      {error && <p className="swim-error">{error}</p>}

      {tab === "meets" && (
        <div className="swim-grid-2">
          {isAdmin && (
            <div className="swim-card">
              <h2>Create meet</h2>
              <form onSubmit={createMeet} className="swim-form">
                <div className="swim-form-row">
                  <Label>Name</Label>
                  <Input value={meetForm.name} onChange={(e) => setMeetForm({ ...meetForm, name: e.target.value })} required />
                </div>
                <div className="swim-form-row">
                  <Label>Date & time</Label>
                  <Input type="datetime-local" value={meetForm.startsAt} onChange={(e) => setMeetForm({ ...meetForm, startsAt: e.target.value })} required />
                </div>
                <div className="swim-form-row">
                  <Label>Location</Label>
                  <Input value={meetForm.location} onChange={(e) => setMeetForm({ ...meetForm, location: e.target.value })} required />
                </div>
                <Button type="submit">Create meet</Button>
              </form>
            </div>
          )}
          <div className="swim-card" style={{ gridColumn: isAdmin ? undefined : "1 / -1" }}>
            <h2>Meets</h2>
            {meets.length === 0 ? (
              <p className="swim-meet-meta">No meets yet.</p>
            ) : (
              <ul style={{ listStyle: "none", padding: 0 }}>
                {meets.map((m) => (
                  <li key={m.id} style={{ padding: "0.5rem 0", borderBottom: "1px solid var(--border)" }}>
                    <Link href={`/swim/manage/org/${org.id}/meets/${m.id}/`} style={{ fontWeight: 500 }}>
                      {m.name}
                    </Link>
                    <div className="swim-meet-meta">
                      {new Date(m.startsAt).toLocaleString()} · {m.location}
                      {m.publishedAt && <Badge style={{ marginLeft: 8 }}>Published</Badge>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {tab === "invites" && isAdmin && (
        <div className="space-y-4">
          <div className="swim-card">
            <h2>Invite members</h2>
            <p className="swim-meet-meta">Paste emails separated by commas or new lines.</p>
            <form onSubmit={sendInvites} className="swim-form" style={{ maxWidth: "100%" }}>
              <Textarea value={inviteEmails} onChange={(e) => setInviteEmails(e.target.value)} rows={4} placeholder="coach@example.com, timer@example.com" />
              <div className="swim-form-row">
                <Label>Default role</Label>
                <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as "admin" | "manager")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit">Send invites</Button>
            </form>
          </div>
          <div className="swim-card">
            <h2>Invitations</h2>
            <DataTable columns={inviteColumns} data={invites} filterColumn="email" />
          </div>
        </div>
      )}
    </div>
  );
}
