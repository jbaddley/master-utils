"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { SwimMeet } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatMeetDateTime } from "@/lib/swim/datetime";
import { useSwimHref } from "@/hooks/useSwimHref";

type MeetEvent = {
  id: string;
  number: number;
  title: string;
  _count: { heats: number };
};

type Props = {
  orgId: string;
  meet: SwimMeet;
};

function eventLabel(event: MeetEvent, displayNumber: number) {
  return `Event ${displayNumber}: ${event.title}`;
}

export default function EventOrderPage({ orgId, meet }: Props) {
  const { href } = useSwimHref();
  const [events, setEvents] = useState<MeetEvent[]>([]);
  const [savedOrder, setSavedOrder] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const meetHref = href(`/swim/manage/org/${orgId}/meets/${meet.id}/`);

  const loadEvents = useCallback(async () => {
    setError("");
    const res = await fetch(`/api/swim/meets/${meet.id}/events`);
    const data = (await res.json()) as { events?: MeetEvent[]; error?: string };
    if (!res.ok) {
      setError(data.error ?? "Could not load events");
      setLoading(false);
      return;
    }
    const loaded = data.events ?? [];
    setEvents(loaded);
    setSavedOrder(loaded.map((event) => event.id));
    setLoading(false);
  }, [meet.id]);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  const currentOrder = useMemo(() => events.map((event) => event.id), [events]);
  const isDirty = useMemo(
    () => currentOrder.length > 0 && currentOrder.some((id, index) => id !== savedOrder[index]),
    [currentOrder, savedOrder],
  );

  function handleDragStart(index: number) {
    setDragIndex(index);
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    setDragOverIndex(index);
  }

  function handleDrop(e: React.DragEvent, toIndex: number) {
    e.preventDefault();
    if (dragIndex === null || dragIndex === toIndex) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    setEvents((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
    setDragIndex(null);
    setDragOverIndex(null);
  }

  function handleDragEnd() {
    setDragIndex(null);
    setDragOverIndex(null);
  }

  function resetOrder() {
    setEvents((prev) => {
      const byId = new Map(prev.map((event) => [event.id, event]));
      return savedOrder.map((id) => byId.get(id)).filter(Boolean) as MeetEvent[];
    });
  }

  async function saveOrder() {
    setSaving(true);
    setError("");
    const res = await fetch(`/api/swim/meets/${meet.id}/events`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventIds: currentOrder }),
    });
    const data = (await res.json()) as { events?: MeetEvent[]; error?: string };
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Could not save event order");
      return;
    }
    const updated = data.events ?? [];
    setEvents(updated);
    setSavedOrder(updated.map((event) => event.id));
  }

  return (
    <div>
      <div className="swim-meet-header">
        <Link href={meetHref} className="swim-meet-meta">← Back to meet</Link>
        <h1>Event order</h1>
        <p className="swim-meet-meta">
          {meet.name} · {formatMeetDateTime(meet.startsAt)} · {meet.location}
          {meet.publishedAt && <Badge style={{ marginLeft: 8 }}>Published</Badge>}
        </p>
      </div>

      <div className="swim-card">
        <div className="swim-event-order-toolbar">
          <div>
            <h2>Program events</h2>
            <p className="swim-meet-meta">
              Drag events into the order they should run. Numbers update when you save.
            </p>
          </div>
          <div className="swim-event-order-actions">
            <Button variant="outline" type="button" disabled={!isDirty || saving} onClick={resetOrder}>
              Reset
            </Button>
            <Button type="button" disabled={!isDirty || saving} onClick={() => void saveOrder()}>
              {saving ? "Saving…" : "Save order"}
            </Button>
          </div>
        </div>

        {error && <p className="swim-error">{error}</p>}

        {loading ? (
          <p className="swim-loading">Loading events…</p>
        ) : events.length === 0 ? (
          <p className="swim-meet-meta">
            No events yet. Import a program or add entries on the{" "}
            <Link href={meetHref}>meet page</Link> first.
          </p>
        ) : (
          <ol className="swim-event-order-list">
            {events.map((event, index) => (
              <li
                key={event.id}
                className={`swim-event-order-item${dragIndex === index ? " swim-event-order-item-dragging" : ""}${dragOverIndex === index ? " swim-event-order-item-over" : ""}`}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
              >
                <span className="swim-event-order-grip" aria-hidden="true">⋮⋮</span>
                <div className="swim-event-order-body">
                  <strong>{eventLabel(event, index + 1)}</strong>
                  <span className="swim-meet-meta">
                    {event._count.heats} heat{event._count.heats === 1 ? "" : "s"}
                    {event.number !== index + 1 && isDirty && (
                      <> · currently event {event.number}</>
                    )}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        )}

        {isDirty && !loading && events.length > 0 && (
          <p className="swim-meet-meta swim-event-order-unsaved">You have unsaved changes.</p>
        )}
      </div>
    </div>
  );
}
