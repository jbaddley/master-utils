"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable } from "@/features/swim/components/DataTable";

type FlatEntry = {
  id: string;
  lastName: string;
  firstName: string;
  age: number;
  team: string;
  event: string;
  heat: string;
  lane: number;
  seedTime: string;
  swimmerId: string;
};

type Swimmer = { id: string; label: string; age: number; team: string };

type MeetData = {
  meet: { id: string; name: string; startsAt: string; location: string; slug: string };
  org: { id: string; name: string; website: string | null };
  entries: FlatEntry[];
  swimmers: Swimmer[];
};

export default function PublicMeetPage({ slug }: { slug: string }) {
  const { data: session } = useSession();
  const [data, setData] = useState<MeetData | null>(null);
  const [error, setError] = useState("");
  const [selectedSwimmers, setSelectedSwimmers] = useState<string[]>([]);
  const [view, setView] = useState<"table" | "participants">("table");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(`/api/swim/public/meets/${slug}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d);
      });
  }, [slug]);

  const columns: ColumnDef<FlatEntry>[] = useMemo(
    () => [
      { accessorKey: "lastName", header: "Last Name" },
      { accessorKey: "firstName", header: "First Name" },
      { accessorKey: "age", header: "Age" },
      { accessorKey: "team", header: "Team" },
      { accessorKey: "event", header: "Event" },
      { accessorKey: "heat", header: "Heat" },
      { accessorKey: "lane", header: "Lane" },
      { accessorKey: "seedTime", header: "Seed Time" },
    ],
    [],
  );

  const filteredEntries = useMemo(() => {
    if (!data || selectedSwimmers.length === 0) return data?.entries ?? [];
    return data.entries.filter((e) => selectedSwimmers.includes(e.swimmerId));
  }, [data, selectedSwimmers]);

  async function followOrg() {
    if (!session?.user || !data) {
      window.location.href = `/swim/login/?callbackUrl=/swim/m/${slug}/`;
      return;
    }
    await fetch("/api/swim/followers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId: data.org.id,
        savedSwimmerIds: selectedSwimmers,
        emailMeetUpdates: true,
      }),
    });
    setSaved(true);
  }

  if (error) {
    return (
      <div className="swim-card" style={{ margin: "2rem auto", maxWidth: 480 }}>
        <p className="swim-error">{error}</p>
        <Link href="/swim/">Home</Link>
      </div>
    );
  }

  if (!data) return <p style={{ padding: "2rem" }}>Loading…</p>;

  return (
    <div>
      <div className="swim-meet-header">
        <p className="swim-meet-meta">
          {data.org.name}
          {data.org.website && (
            <> · <a href={data.org.website} target="_blank" rel="noreferrer">{data.org.website}</a></>
          )}
        </p>
        <h1>{data.meet.name}</h1>
        <p className="swim-meet-meta">
          {new Date(data.meet.startsAt).toLocaleString()} · {data.meet.location}
        </p>
      </div>

      <div className="swim-card" style={{ marginBottom: "1rem" }}>
        <h2>Select participants</h2>
        <p className="swim-meet-meta">Choose swimmers to see their events.</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.5rem" }}>
          {data.swimmers.map((s) => (
            <label key={s.id} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.875rem" }}>
              <Checkbox
                checked={selectedSwimmers.includes(s.id)}
                onCheckedChange={(checked) => {
                  setSelectedSwimmers((prev) =>
                    checked ? [...prev, s.id] : prev.filter((id) => id !== s.id),
                  );
                }}
              />
              {s.label} ({s.age}, {s.team})
            </label>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: "0.75rem" }}>
          <Button variant={view === "table" ? "default" : "outline"} onClick={() => setView("table")}>Table view</Button>
          <Button variant={view === "participants" ? "default" : "outline"} onClick={() => setView("participants")} disabled={selectedSwimmers.length === 0}>
            Participant view
          </Button>
          <Button variant="outline" onClick={followOrg}>
            {saved ? "Saved!" : "Save swimmers & follow org"}
          </Button>
        </div>
      </div>

      {view === "table" ? (
        <div className="swim-card">
          <DataTable columns={columns} data={filteredEntries.length && selectedSwimmers.length ? filteredEntries : data.entries} filterColumn="lastName" />
        </div>
      ) : (
        <div className="swim-participant-cards">
          {selectedSwimmers.map((sid) => {
            const swimmer = data.swimmers.find((s) => s.id === sid);
            const rows = data.entries.filter((e) => e.swimmerId === sid);
            return (
              <div key={sid} className="swim-participant-card">
                <h3>{swimmer?.label} · {swimmer?.age} · {swimmer?.team}</h3>
                {rows.map((r) => (
                  <div key={r.id} className="swim-entry-line">
                    {r.event} · {r.heat} · Lane {r.lane} · {r.seedTime}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
