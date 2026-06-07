"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { SwimOrgRole } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type StudentRow = {
  id: string;
  firstName: string;
  lastName: string;
  age: number | null;
  userId: string | null;
  user: { id: string; email: string; name: string | null } | null;
  guardianLinks: { guardian: { id: string; email: string; name: string | null } }[];
};

type GuardianMember = { userId: string; email: string; name: string | null };

type Props = {
  orgId: string;
  role: SwimOrgRole;
};

export default function StudentsManagePanel({ orgId, role }: Props) {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [guardians, setGuardians] = useState<GuardianMember[]>([]);
  const [form, setForm] = useState({ firstName: "", lastName: "", age: "" });
  const [linkForm, setLinkForm] = useState({ guardianUserId: "", studentId: "" });
  const canLinkGuardians = role === "admin" || role === "director";
  const canCreate = ["admin", "manager", "director", "coach"].includes(role);

  const load = useCallback(async () => {
    const res = await fetch(`/api/swim/orgs/${orgId}/students`);
    const data = await res.json();
    if (data.students) setStudents(data.students);
  }, [orgId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!canLinkGuardians) return;
    void fetch(`/api/swim/orgs/${orgId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.org?.members) {
          setGuardians(
            d.org.members
              .filter((m: { role: string }) => m.role === "guardian")
              .map((m: { userId: string; user: { email: string; name: string | null } }) => ({
                userId: m.userId,
                email: m.user.email,
                name: m.user.name,
              })),
          );
        }
      });
  }, [orgId, canLinkGuardians]);

  async function createStudent(e: FormEvent) {
    e.preventDefault();
    await fetch(`/api/swim/orgs/${orgId}/students`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: form.firstName,
        lastName: form.lastName,
        age: form.age ? parseInt(form.age, 10) : undefined,
      }),
    });
    setForm({ firstName: "", lastName: "", age: "" });
    void load();
  }

  async function linkGuardian(e: FormEvent) {
    e.preventDefault();
    await fetch(`/api/swim/orgs/${orgId}/guardian/students`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(linkForm),
    });
    setLinkForm({ guardianUserId: "", studentId: "" });
    void load();
  }

  async function unlinkGuardian(guardianUserId: string, studentId: string) {
    await fetch(
      `/api/swim/orgs/${orgId}/guardian/students?guardianUserId=${guardianUserId}&studentId=${studentId}`,
      { method: "DELETE" },
    );
    void load();
  }

  return (
    <div className="space-y-4">
      {canCreate && (
        <div className="swim-card">
          <h2>Add student</h2>
          <form onSubmit={createStudent} className="swim-grid-2">
            <div className="swim-form-row">
              <Label>First name</Label>
              <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
            </div>
            <div className="swim-form-row">
              <Label>Last name</Label>
              <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
            </div>
            <div className="swim-form-row">
              <Label>Age</Label>
              <Input value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} />
            </div>
            <Button type="submit">Add student</Button>
          </form>
        </div>
      )}

      {canLinkGuardians && (
        <div className="swim-card">
          <h2>Link guardian to student</h2>
          <form onSubmit={linkGuardian} className="swim-form">
            <div className="swim-form-row">
              <Label>Guardian</Label>
              <Select
                value={linkForm.guardianUserId}
                onValueChange={(v) => setLinkForm({ ...linkForm, guardianUserId: v ?? "" })}
              >
                <SelectTrigger><SelectValue placeholder="Select guardian" /></SelectTrigger>
                <SelectContent>
                  {guardians.map((g) => (
                    <SelectItem key={g.userId} value={g.userId}>{g.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="swim-form-row">
              <Label>Student</Label>
              <Select
                value={linkForm.studentId}
                onValueChange={(v) => setLinkForm({ ...linkForm, studentId: v ?? "" })}
              >
                <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                <SelectContent>
                  {students.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.firstName} {s.lastName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit">Link</Button>
          </form>
        </div>
      )}

      <div className="swim-card">
        <h2>Students ({students.length})</h2>
        {students.length === 0 ? (
          <p className="swim-meet-meta">No students yet.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0 }}>
            {students.map((s) => (
              <li key={s.id} style={{ padding: "0.75rem 0", borderBottom: "1px solid var(--border)" }}>
                <strong>{s.firstName} {s.lastName}</strong>
                {s.age != null && <span className="swim-meet-meta"> · age {s.age}</span>}
                {s.user && <span className="swim-meet-meta"> · linked: {s.user.email}</span>}
                {s.guardianLinks.length > 0 && (
                  <div className="swim-meet-meta" style={{ marginTop: 4 }}>
                    Guardians:{" "}
                    {s.guardianLinks.map((g) => (
                      <span key={g.guardian.id}>
                        {g.guardian.email}
                        {canLinkGuardians && (
                          <button
                            type="button"
                            style={{ marginLeft: 4, textDecoration: "underline" }}
                            onClick={() => void unlinkGuardian(g.guardian.id, s.id)}
                          >
                            unlink
                          </button>
                        )}
                        {" · "}
                      </span>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
