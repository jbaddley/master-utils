"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import type { ColumnDef } from "@tanstack/react-table";
import { LuUsers, LuX, LuSearch, LuBookmark, LuCheck, LuChevronDown } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
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

// ── Swimmer picker modal ────────────────────────────────────────────────────

function SwimmerPickerModal({
  swimmers,
  selected,
  onChange,
  onClose,
}: {
  swimmers: Swimmer[];
  selected: string[];
  onChange: (ids: string[]) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const filtered = useMemo(() => {
    if (!query.trim()) return swimmers;
    const q = query.toLowerCase();
    return swimmers.filter(
      (s) => s.label.toLowerCase().includes(q) || s.team.toLowerCase().includes(q),
    );
  }, [swimmers, query]);

  const allFilteredSelected = filtered.length > 0 && filtered.every((s) => selected.includes(s.id));

  function toggleAll() {
    if (allFilteredSelected) {
      const filteredIds = new Set(filtered.map((s) => s.id));
      onChange(selected.filter((id) => !filteredIds.has(id)));
    } else {
      const toAdd = filtered.map((s) => s.id).filter((id) => !selected.includes(id));
      onChange([...selected, ...toAdd]);
    }
  }

  return (
    <>
      <div className="swim-modal-backdrop" onClick={onClose} aria-hidden />
      <div className="swim-modal" role="dialog" aria-modal="true" aria-label="Select swimmers">
        <div className="swim-modal-header">
          <h2 className="swim-modal-title">Select swimmers</h2>
          <button type="button" className="swim-modal-close" onClick={onClose} aria-label="Close">
            <LuX aria-hidden />
          </button>
        </div>

        <div className="swim-modal-search">
          <LuSearch className="swim-modal-search-icon" aria-hidden />
          <Input
            ref={inputRef}
            placeholder="Search by name or team…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="swim-modal-search-input"
          />
        </div>

        <div className="swim-modal-body">
          {filtered.length === 0 ? (
            <p className="swim-modal-empty">No swimmers match &ldquo;{query}&rdquo;</p>
          ) : (
            <>
              {swimmers.length > 3 && (
                <label className="swim-modal-item swim-modal-item--select-all">
                  <Checkbox
                    checked={allFilteredSelected}
                    onCheckedChange={toggleAll}
                  />
                  <span className="swim-modal-item-name">
                    {allFilteredSelected ? "Deselect all" : "Select all"}
                    {query ? ` matching "${query}"` : ""}
                  </span>
                </label>
              )}
              {filtered.map((s) => (
                <label key={s.id} className="swim-modal-item">
                  <Checkbox
                    checked={selected.includes(s.id)}
                    onCheckedChange={(checked) =>
                      onChange(checked ? [...selected, s.id] : selected.filter((id) => id !== s.id))
                    }
                  />
                  <span className="swim-modal-item-name">{s.label}</span>
                  <span className="swim-modal-item-meta">{s.age} · {s.team}</span>
                </label>
              ))}
            </>
          )}
        </div>

        <div className="swim-modal-footer">
          <span className="swim-modal-count">
            {selected.length > 0 ? `${selected.length} selected` : "None selected"}
          </span>
          <div className="swim-modal-footer-actions">
            {selected.length > 0 && (
              <button type="button" className="swim-modal-clear" onClick={() => onChange([])}>
                Clear all
              </button>
            )}
            <Button onClick={onClose}>Done</Button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function PublicMeetPage({ slug }: { slug: string }) {
  const { data: session } = useSession();
  const [data, setData] = useState<MeetData | null>(null);
  const [error, setError] = useState("");
  const [selectedSwimmers, setSelectedSwimmers] = useState<string[]>([]);
  const [view, setView] = useState<"table" | "participants">("table");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(`/api/swim/public/meets/${slug}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d);
      });
  }, [slug]);

  const closePicker = useCallback(() => setPickerOpen(false), []);

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
    if (!data) return [];
    if (selectedSwimmers.length === 0) return data.entries;
    return data.entries.filter((e) => selectedSwimmers.includes(e.swimmerId));
  }, [data, selectedSwimmers]);

  async function followOrg() {
    if (!session?.user || !data) {
      window.location.href = `/swim/login/?callbackUrl=/swim/m/${slug}/`;
      return;
    }
    setSaving(true);
    await fetch("/api/swim/followers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId: data.org.id,
        savedSwimmerIds: selectedSwimmers,
        emailMeetUpdates: true,
      }),
    });
    setSaving(false);
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

  if (!data) {
    return (
      <div className="swim-loading">
        <div className="swim-loading-spinner" />
        <p>Loading meet…</p>
      </div>
    );
  }

  const selectedSwimmerObjects = data.swimmers.filter((s) => selectedSwimmers.includes(s.id));

  return (
    <div>
      {/* Header */}
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

      {/* Participant filter bar */}
      <div className="swim-filter-bar">
        <div className="swim-filter-bar-left">
          <button
            type="button"
            className="swim-picker-trigger"
            onClick={() => setPickerOpen(true)}
          >
            <LuUsers aria-hidden />
            {selectedSwimmers.length > 0
              ? `${selectedSwimmers.length} swimmer${selectedSwimmers.length === 1 ? "" : "s"} selected`
              : "Filter by swimmer"}
            <LuChevronDown aria-hidden className="swim-picker-trigger-chevron" />
          </button>

          {/* Selected swimmer chips */}
          {selectedSwimmerObjects.map((s) => (
            <span key={s.id} className="swim-chip">
              {s.label}
              <button
                type="button"
                aria-label={`Remove ${s.label}`}
                className="swim-chip-remove"
                onClick={() => setSelectedSwimmers((prev) => prev.filter((id) => id !== s.id))}
              >
                <LuX aria-hidden />
              </button>
            </span>
          ))}

          {selectedSwimmers.length > 1 && (
            <button
              type="button"
              className="swim-clear-all"
              onClick={() => setSelectedSwimmers([])}
            >
              Clear all
            </button>
          )}
        </div>

        <div className="swim-filter-bar-right">
          <button
            type="button"
            className={`swim-save-btn${saved ? " swim-save-btn--saved" : ""}`}
            onClick={followOrg}
            disabled={saving || saved}
          >
            {saved ? (
              <><LuCheck aria-hidden /> Saved</>
            ) : (
              <><LuBookmark aria-hidden /> {saving ? "Saving…" : "Save & follow"}</>
            )}
          </button>
        </div>
      </div>

      {/* View tabs + table/cards */}
      <div className="swim-card">
        <div className="swim-view-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={view === "table"}
            className={`swim-view-tab${view === "table" ? " swim-view-tab--active" : ""}`}
            onClick={() => setView("table")}
          >
            Table view
            {selectedSwimmers.length > 0 && view === "table" && (
              <span className="swim-view-tab-badge">{filteredEntries.length}</span>
            )}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === "participants"}
            className={`swim-view-tab${view === "participants" ? " swim-view-tab--active" : ""}${selectedSwimmers.length === 0 ? " swim-view-tab--disabled" : ""}`}
            onClick={() => selectedSwimmers.length > 0 && setView("participants")}
            aria-disabled={selectedSwimmers.length === 0}
            title={selectedSwimmers.length === 0 ? "Select at least one swimmer first" : undefined}
          >
            Participant cards
            {selectedSwimmers.length > 0 && (
              <span className="swim-view-tab-badge">{selectedSwimmers.length}</span>
            )}
          </button>
        </div>

        {view === "table" ? (
          <DataTable
            columns={columns}
            data={filteredEntries}
            filterColumn="lastName"
            filterPlaceholder="Filter by last name…"
          />
        ) : (
          <div className="swim-participant-cards">
            {selectedSwimmerObjects.map((swimmer) => {
              const rows = data.entries.filter((e) => e.swimmerId === swimmer.id);
              return (
                <div key={swimmer.id} className="swim-participant-card">
                  <div className="swim-participant-card-header">
                    <h3>{swimmer.label}</h3>
                    <span className="swim-participant-card-meta">{swimmer.age} · {swimmer.team}</span>
                  </div>
                  <div className="swim-participant-events">
                    {rows.length === 0 ? (
                      <p className="swim-meet-meta">No entries found.</p>
                    ) : (
                      rows.map((r) => (
                        <div key={r.id} className="swim-entry-line">
                          <span className="swim-entry-event">{r.event}</span>
                          <span className="swim-entry-detail">{r.heat} · Lane {r.lane}</span>
                          <span className="swim-entry-seed">{r.seedTime}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Swimmer picker modal */}
      {pickerOpen && (
        <SwimmerPickerModal
          swimmers={data.swimmers}
          selected={selectedSwimmers}
          onChange={setSelectedSwimmers}
          onClose={closePicker}
        />
      )}
    </div>
  );
}
