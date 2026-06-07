"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { SwimOrgRole } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Cohort = {
  id: string;
  name: string | null;
  coach: { id: string; email: string; name: string | null };
  members: { student: { id: string; firstName: string; lastName: string } }[];
};

type StudentOption = { id: string; firstName: string; lastName: string };

type Props = {
  orgId: string;
  role: SwimOrgRole;
};

export default function CohortsManagePanel({ orgId, role }: Props) {
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [name, setName] = useState("");
  const [addStudent, setAddStudent] = useState<{ cohortId: string; studentId: string }>({
    cohortId: "",
    studentId: "",
  });

  const canManage = ["coach", "admin", "director"].includes(role);

  const load = useCallback(async () => {
    const [cohortRes, studentRes] = await Promise.all([
      fetch(`/api/swim/orgs/${orgId}/cohorts`),
      fetch(`/api/swim/orgs/${orgId}/students`),
    ]);
    const cohortData = await cohortRes.json();
    const studentData = await studentRes.json();
    if (cohortData.cohorts) setCohorts(cohortData.cohorts);
    if (studentData.students) setStudents(studentData.students);
  }, [orgId]);

  useEffect(() => {
    if (canManage) void load();
  }, [load, canManage]);

  async function createCohort(e: FormEvent) {
    e.preventDefault();
    await fetch(`/api/swim/orgs/${orgId}/cohorts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setName("");
    void load();
  }

  async function addStudentToCohort(e: FormEvent) {
    e.preventDefault();
    await fetch(`/api/swim/orgs/${orgId}/cohorts/${addStudent.cohortId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId: addStudent.studentId, action: "add" }),
    });
    setAddStudent({ cohortId: "", studentId: "" });
    void load();
  }

  async function removeStudent(cohortId: string, studentId: string) {
    await fetch(`/api/swim/orgs/${orgId}/cohorts/${cohortId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId, action: "remove" }),
    });
    void load();
  }

  if (!canManage) {
    return (
      <div className="swim-card">
        <p className="swim-meet-meta">Cohort management is available to coaches and directors.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="swim-card">
        <h2>Create cohort</h2>
        <form onSubmit={createCohort} className="swim-form">
          <div className="swim-form-row">
            <Label>Name (optional)</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. 10U Freestyle" />
          </div>
          <Button type="submit">Create cohort</Button>
        </form>
      </div>

      <div className="swim-card">
        <h2>Add student to cohort</h2>
        <form onSubmit={addStudentToCohort} className="swim-form">
          <div className="swim-form-row">
            <Label>Cohort</Label>
            <Select
              value={addStudent.cohortId}
              onValueChange={(v) => setAddStudent({ ...addStudent, cohortId: v ?? "" })}
            >
              <SelectTrigger><SelectValue placeholder="Select cohort" /></SelectTrigger>
              <SelectContent>
                {cohorts.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name ?? `Cohort ${c.id.slice(0, 6)}`}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="swim-form-row">
            <Label>Student</Label>
            <Select
              value={addStudent.studentId}
              onValueChange={(v) => setAddStudent({ ...addStudent, studentId: v ?? "" })}
            >
              <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
              <SelectContent>
                {students.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.firstName} {s.lastName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit">Add to cohort</Button>
        </form>
      </div>

      {cohorts.map((c) => (
        <div key={c.id} className="swim-card">
          <h2>{c.name ?? "Cohort"}</h2>
          <p className="swim-meet-meta">Coach: {c.coach.email}</p>
          {c.members.length === 0 ? (
            <p className="swim-meet-meta">No students in this cohort.</p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0 }}>
              {c.members.map((m) => (
                <li key={m.student.id} style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0" }}>
                  <span>{m.student.firstName} {m.student.lastName}</span>
                  <Button variant="outline" size="sm" onClick={() => void removeStudent(c.id, m.student.id)}>
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}
