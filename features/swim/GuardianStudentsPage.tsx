"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { SwimStudent } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { useSwimHref } from "@/hooks/useSwimHref";
import { formatMeetDateTime } from "@/lib/swim/datetime";

type FlatEntry = {
  id: string;
  lastName: string;
  firstName: string;
  age: number | null;
  team: string;
  event: string;
  heat: string;
  lane: number;
  seedTime: string;
};

type MeetEntries = {
  meet: { id: string; name: string; startsAt: string; location: string };
  entries: FlatEntry[];
};

type Props = {
  orgId: string;
  orgName: string;
};

export default function GuardianStudentsPage({ orgId, orgName }: Props) {
  const [students, setStudents] = useState<SwimStudent[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [meetEntries, setMeetEntries] = useState<MeetEntries[]>([]);
  const [loading, setLoading] = useState(true);
  const { href } = useSwimHref();

  const loadStudents = useCallback(async () => {
    const res = await fetch(`/api/swim/orgs/${orgId}/guardian/students`);
    const data = await res.json();
    if (data.students) {
      setStudents(data.students);
      if (data.students.length > 0 && !selectedStudentId) {
        setSelectedStudentId(data.students[0].id);
      }
    }
    setLoading(false);
  }, [orgId, selectedStudentId]);

  useEffect(() => {
    void loadStudents();
  }, [loadStudents]);

  useEffect(() => {
    if (!selectedStudentId) {
      setMeetEntries([]);
      return;
    }
    void fetch(`/api/swim/orgs/${orgId}/guardian/students/${selectedStudentId}/entries`)
      .then((r) => r.json())
      .then((d) => {
        if (d.entries) setMeetEntries(d.entries);
      });
  }, [orgId, selectedStudentId]);

  if (loading) {
    return <p className="swim-meet-meta">Loading…</p>;
  }

  return (
    <div>
      <div className="swim-meet-header">
        <Link href={href("/swim/manage/")} className="swim-meet-meta">← Organizations</Link>
        <h1>{orgName}</h1>
        <p className="swim-meet-meta">Your students</p>
      </div>

      {students.length === 0 ? (
        <div className="swim-card">
          <p>No students are linked to your account yet. Ask a director or admin to connect you to your swimmers.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="swim-card">
            <h2>Students</h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {students.map((s) => (
                <Button
                  key={s.id}
                  variant={selectedStudentId === s.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedStudentId(s.id)}
                >
                  {s.firstName} {s.lastName}
                </Button>
              ))}
            </div>
          </div>

          {selectedStudentId && (
            <div className="swim-card">
              <h2>Schedule</h2>
              {meetEntries.length === 0 ? (
                <p className="swim-meet-meta">No meet entries yet.</p>
              ) : (
                meetEntries.map(({ meet, entries }) => (
                  <div key={meet.id} style={{ marginBottom: "1.5rem" }}>
                    <h3 style={{ fontWeight: 600 }}>{meet.name}</h3>
                    <p className="swim-meet-meta">{formatMeetDateTime(meet.startsAt)} · {meet.location}</p>
                    <table className="swim-table" style={{ width: "100%", marginTop: 8 }}>
                      <thead>
                        <tr>
                          <th>Event</th>
                          <th>Heat</th>
                          <th>Lane</th>
                          <th>Seed</th>
                          <th>Team</th>
                        </tr>
                      </thead>
                      <tbody>
                        {entries.map((e) => (
                          <tr key={e.id}>
                            <td>{e.event}</td>
                            <td>{e.heat}</td>
                            <td>{e.lane}</td>
                            <td>{e.seedTime}</td>
                            <td>{e.team}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
