"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import QRCode from "qrcode";
import type { SwimMeet, SwimOrgRole } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "./components/DataTable";
import { CsvImporter } from "./components/CsvImporter";
import { DateTimePicker } from "./components/DateTimePicker";
import { FIELD_TO_CANONICAL } from "@/lib/swim/column-mapper";
import { datetimeLocalToUtcIso, formatMeetDateTime, toDatetimeLocalValue } from "@/lib/swim/datetime";
import { useSwimHref } from "@/hooks/useSwimHref";

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
};

type Props = {
  orgId: string;
  role: SwimOrgRole;
  meet: SwimMeet;
};

const EDIT_ENTRY_FIELD_LABELS = {
  lastName: "Last Name",
  firstName: "First Name",
  age: "Age",
  team: "Team",
  event: "Event",
  heat: "Heat",
  lane: "Lane",
  seedTime: "Seed Time",
} as const;

export default function MeetEditor({ orgId, role, meet: initialMeet }: Props) {
  const [tab, setTab] = useState<"entries" | "import" | "publish" | "details">("entries");
  const [meet, setMeet] = useState(initialMeet);
  const [entries, setEntries] = useState<FlatEntry[]>([]);
  const [publicUrl, setPublicUrl] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [editEntry, setEditEntry] = useState<FlatEntry | null>(null);
  const [newEntry, setNewEntry] = useState({
    lastName: "", firstName: "", age: "", teamCode: "", eventLabel: "", heatLabel: "", lane: "", seedTimeDisplay: "NT",
  });
  const [detailsForm, setDetailsForm] = useState({
    name: meet.name,
    startsAt: toDatetimeLocalValue(meet.startsAt),
    location: meet.location,
    slug: meet.slug,
  });

  const isAdmin = role === "admin";
  const { href, absoluteUrl } = useSwimHref();

  const loadMeet = useCallback(async () => {
    const res = await fetch(`/api/swim/meets/${meet.id}`);
    const data = await res.json();
    if (data.entries) setEntries(data.entries);
    if (data.meet) setMeet(data.meet);
  }, [meet.id]);

  useEffect(() => {
    setDetailsForm({
      name: meet.name,
      startsAt: toDatetimeLocalValue(meet.startsAt),
      location: meet.location,
      slug: meet.slug,
    });
  }, [meet.id, meet.name, meet.startsAt, meet.location, meet.slug]);

  useEffect(() => { void loadMeet(); }, [loadMeet]);

  useEffect(() => {
    if (meet.publishedAt) {
      const url = absoluteUrl(`/swim/m/${meet.slug}/`);
      setPublicUrl(url);
      void QRCode.toDataURL(url, { width: 256, margin: 2 }).then(setQrDataUrl);
    }
  }, [meet.publishedAt, meet.slug, absoluteUrl]);

  const entryColumns: ColumnDef<FlatEntry>[] = [
    { accessorKey: "lastName", header: "Last Name" },
    { accessorKey: "firstName", header: "First Name" },
    { accessorKey: "age", header: "Age" },
    { accessorKey: "team", header: "Team" },
    { accessorKey: "event", header: "Event" },
    { accessorKey: "heat", header: "Heat" },
    { accessorKey: "lane", header: "Lane" },
    { accessorKey: "seedTime", header: "Seed Time" },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div style={{ display: "flex", gap: 4 }}>
          <Button variant="outline" size="sm" onClick={() => setEditEntry(row.original)}>Edit</Button>
          <Button variant="destructive" size="sm" onClick={() => deleteEntry(row.original.id)}>Delete</Button>
        </div>
      ),
    },
  ];

  async function deleteEntry(id: string) {
    await fetch(`/api/swim/meets/${meet.id}/entries/${id}`, { method: "DELETE" });
    void loadMeet();
  }

  async function saveEntry(e: FormEvent, entry?: FlatEntry) {
    e.preventDefault();
    const form = entry ?? {
      ...newEntry,
      age: parseInt(newEntry.age, 10),
      lane: parseInt(newEntry.lane, 10),
    };
    const body = entry
      ? {
          lastName: editEntry!.lastName,
          firstName: editEntry!.firstName,
          age: editEntry!.age,
          teamCode: editEntry!.team,
          eventLabel: editEntry!.event,
          heatLabel: editEntry!.heat,
          lane: editEntry!.lane,
          seedTimeDisplay: editEntry!.seedTime,
        }
      : {
          lastName: newEntry.lastName,
          firstName: newEntry.firstName,
          age: parseInt(newEntry.age, 10),
          teamCode: newEntry.teamCode,
          eventLabel: newEntry.eventLabel,
          heatLabel: newEntry.heatLabel,
          lane: parseInt(newEntry.lane, 10),
          seedTimeDisplay: newEntry.seedTimeDisplay,
        };

    const url = entry
      ? `/api/swim/meets/${meet.id}/entries/${entry.id}`
      : `/api/swim/meets/${meet.id}/entries`;
    const res = await fetch(url, {
      method: entry ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setEditEntry(null);
      setNewEntry({ lastName: "", firstName: "", age: "", teamCode: "", eventLabel: "", heatLabel: "", lane: "", seedTimeDisplay: "NT" });
      void loadMeet();
    }
  }


  async function publishMeet() {
    const res = await fetch(`/api/swim/meets/${meet.id}/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: detailsForm.slug }),
    });
    const data = await res.json();
    setMeet(data.meet);
    setPublicUrl(data.publicUrl);
    void QRCode.toDataURL(data.publicUrl, { width: 256, margin: 2 }).then(setQrDataUrl);
  }

  async function saveDetails(e: FormEvent) {
    e.preventDefault();
    const res = await fetch(`/api/swim/meets/${meet.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...detailsForm,
        startsAt: datetimeLocalToUtcIso(detailsForm.startsAt),
      }),
    });
    const data = await res.json();
    setMeet(data.meet);
  }

  return (
    <div>
      <div className="swim-meet-header">
        <Link href={href(`/swim/manage/org/${orgId}/`)} className="swim-meet-meta">← {meet.name}</Link>
        <h1>{meet.name}</h1>
        <p className="swim-meet-meta">
          {formatMeetDateTime(meet.startsAt)} · {meet.location}
          {meet.publishedAt && <Badge style={{ marginLeft: 8 }}>Published</Badge>}
        </p>
      </div>

      <div className="swim-tabs-list">
        {(["entries", "import", "details", "publish"] as const).map((t) => (
          <button key={t} type="button" className={`swim-tab ${tab === t ? "swim-tab-active" : ""}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === "entries" && (
        <div className="space-y-4">
          <div className="swim-card">
            <h2>Add entry</h2>
            <form onSubmit={(e) => saveEntry(e)} className="swim-grid-2">
              {(["lastName", "firstName", "age", "teamCode", "eventLabel", "heatLabel", "lane", "seedTimeDisplay"] as const).map((f) => (
                <div key={f} className="swim-form-row">
                  <Label>{FIELD_TO_CANONICAL[f]}</Label>
                  <Input value={newEntry[f]} onChange={(e) => setNewEntry({ ...newEntry, [f]: e.target.value })} required={f !== "seedTimeDisplay"} />
                </div>
              ))}
              <Button type="submit">Add entry</Button>
            </form>
          </div>
          {editEntry && (
            <div className="swim-card">
              <h2>Edit entry</h2>
              <form onSubmit={(e) => saveEntry(e, editEntry)} className="swim-grid-2">
                {(["lastName", "firstName", "age", "team", "event", "heat", "lane", "seedTime"] as const).map((f) => (
                  <div key={f} className="swim-form-row">
                    <Label>{EDIT_ENTRY_FIELD_LABELS[f]}</Label>
                    <Input
                      value={String(editEntry[f])}
                      onChange={(e) =>
                        setEditEntry({
                          ...editEntry,
                          [f]: f === "age" || f === "lane" ? parseInt(e.target.value, 10) : e.target.value,
                        })
                      }
                    />
                  </div>
                ))}
                <div style={{ display: "flex", gap: 8 }}>
                  <Button type="submit">Save</Button>
                  <Button variant="outline" type="button" onClick={() => setEditEntry(null)}>Cancel</Button>
                </div>
              </form>
            </div>
          )}
          <div className="swim-card">
            <h2>Entries ({entries.length})</h2>
            <DataTable columns={entryColumns} data={entries} filterColumn="lastName" filterPlaceholder="Filter by name…" />
          </div>
        </div>
      )}

      {tab === "import" && isAdmin && (
        <div className="swim-card">
          <h2>Import CSV</h2>
          <CsvImporter meetId={meet.id} onImported={loadMeet} />
        </div>
      )}

      {tab === "details" && (
        <div className="swim-card">
          <h2>Meet details</h2>
          <form onSubmit={saveDetails} className="swim-form">
            <div className="swim-form-row"><Label>Name</Label><Input value={detailsForm.name} onChange={(e) => setDetailsForm({ ...detailsForm, name: e.target.value })} /></div>
            <div className="swim-form-row">
              <Label>Date & time</Label>
              <DateTimePicker
                value={detailsForm.startsAt}
                onChange={(startsAt) => setDetailsForm({ ...detailsForm, startsAt })}
              />
            </div>
            <div className="swim-form-row"><Label>Location</Label><Input value={detailsForm.location} onChange={(e) => setDetailsForm({ ...detailsForm, location: e.target.value })} /></div>
            <div className="swim-form-row"><Label>Slug</Label><Input value={detailsForm.slug} onChange={(e) => setDetailsForm({ ...detailsForm, slug: e.target.value })} /></div>
            <Button type="submit">Save</Button>
          </form>
        </div>
      )}

      {tab === "publish" && isAdmin && (
        <div className="swim-card space-y-3">
          <h2>Publish meet</h2>
          {!meet.publishedAt ? (
            <Button onClick={publishMeet}>Publish now</Button>
          ) : (
            <>
              <p className="swim-success">Published {new Date(meet.publishedAt).toLocaleString()}</p>
              <p><strong>Public URL:</strong> <a href={publicUrl} target="_blank" rel="noreferrer">{publicUrl}</a></p>
              <Button variant="outline" onClick={() => navigator.clipboard.writeText(publicUrl)}>Copy link</Button>
              {qrDataUrl && (
                <div>
                  <img src={qrDataUrl} alt="QR code" width={256} height={256} />
                  <br />
                  <a href={qrDataUrl} download={`${meet.slug}-qr.png`} className="swim-btn swim-btn-outline">Download QR</a>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
