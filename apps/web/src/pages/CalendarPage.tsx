/*!
 * Copyright (c) 2026 ZombieTech LLC. All rights reserved.
 *
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 * See LICENSE in the project root for the full terms.
 *
 * Licensing inquiries: license@zombietech.biz
 */

import { useState } from "react";
import FullCalendar from "@fullcalendar/react";
import type { DateSelectArg, EventClickArg, EventInput } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import rrulePlugin from "@fullcalendar/rrule";
import type { AvailabilityCreate } from "@mysitter/types";
import { useAuth } from "@/hooks/useAuth";
import {
  useMyProviderProfile,
  useProviderAvailability,
  useCreateAvailability,
  useDeleteAvailability,
} from "@/hooks/useProviders";
import { useBookings } from "@/hooks/useBookings";

export default function CalendarPage() {
  const { user } = useAuth();

  if (user?.role === "PROVIDER") return <ProviderCalendar />;
  return <CustomerCalendar />;
}

// ── Provider view: manage availability blocks ─────────────────────────────────

function ProviderCalendar() {
  const { data: profile } = useMyProviderProfile(true);
  const { data: availability } = useProviderAvailability(profile?.id);
  const createAvailability = useCreateAvailability();
  const deleteAvailability = useDeleteAvailability();

  const [addForm, setAddForm] = useState<AvailabilityCreate | null>(null);
  const [error, setError] = useState<string | null>(null);

  const events: EventInput[] = (availability ?? []).map((a) => {
    const base: EventInput = {
      id: a.id,
      title: "Available",
      color: "#86efac",
      textColor: "#166534",
    };

    if (a.rrule_string) {
      const dtstart = new Date(a.start_at)
        .toISOString()
        .replace(/[-:]/g, "")
        .replace(/\.\d{3}Z$/, "Z");
      const durationMs =
        new Date(a.end_at).getTime() - new Date(a.start_at).getTime();
      return {
        ...base,
        rrule: `DTSTART:${dtstart}\nRRULE:${a.rrule_string}`,
        duration: { milliseconds: durationMs },
      };
    }

    return { ...base, start: a.start_at, end: a.end_at };
  });

  function handleSelect(arg: DateSelectArg) {
    setAddForm({ start_at: arg.startStr, end_at: arg.endStr });
    setError(null);
  }

  async function handleEventClick(arg: EventClickArg) {
    if (!confirm("Remove this availability block?")) return;
    try {
      await deleteAvailability.mutateAsync(arg.event.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    }
  }

  async function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!addForm) return;
    setError(null);
    try {
      await createAvailability.mutateAsync({
        ...addForm,
        start_at: new Date(addForm.start_at).toISOString(),
        end_at: new Date(addForm.end_at).toISOString(),
        rrule_string: addForm.rrule_string || undefined,
      });
      setAddForm(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    }
  }

  return (
    <div
      style={{ maxWidth: 1000, margin: "0 auto", padding: 24, fontFamily: "sans-serif" }}
    >
      <h1 style={{ margin: "0 0 4px", fontSize: 24 }}>My Availability</h1>
      <p style={{ color: "#6b7280", margin: "0 0 20px", fontSize: 14 }}>
        Drag to select a time range to add a block. Click an existing block to remove it.
      </p>

      {error && (
        <p style={{ color: "#ef4444", marginBottom: 12 }}>{error}</p>
      )}

      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, rrulePlugin]}
        initialView="timeGridWeek"
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,timeGridDay",
        }}
        selectable
        selectMirror
        events={events}
        select={handleSelect}
        eventClick={handleEventClick}
        height={600}
      />

      {/* Add block modal */}
      {addForm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
          }}
          onClick={(e) => e.target === e.currentTarget && setAddForm(null)}
        >
          <div
            style={{ background: "white", borderRadius: 12, padding: 28, width: 400, maxWidth: "90vw" }}
          >
            <h2 style={{ margin: "0 0 16px", fontSize: 18 }}>
              Add availability block
            </h2>
            <form
              onSubmit={handleAddSubmit}
              style={{ display: "flex", flexDirection: "column", gap: 12 }}
            >
              <label style={{ fontSize: 14, fontWeight: 600 }}>
                Start
                <input
                  type="datetime-local"
                  value={toDatetimeLocal(addForm.start_at)}
                  onChange={(e) =>
                    setAddForm((f) => f && { ...f, start_at: e.target.value })
                  }
                  style={inputStyle}
                  required
                />
              </label>

              <label style={{ fontSize: 14, fontWeight: 600 }}>
                End
                <input
                  type="datetime-local"
                  value={toDatetimeLocal(addForm.end_at)}
                  onChange={(e) =>
                    setAddForm((f) => f && { ...f, end_at: e.target.value })
                  }
                  style={inputStyle}
                  required
                />
              </label>

              <label style={{ fontSize: 14, fontWeight: 600 }}>
                Recurrence rule{" "}
                <span style={{ fontWeight: 400, color: "#6b7280" }}>(optional)</span>
                <input
                  type="text"
                  placeholder="e.g. FREQ=WEEKLY;BYDAY=MO,WE,FR"
                  value={addForm.rrule_string ?? ""}
                  onChange={(e) =>
                    setAddForm((f) =>
                      f ? { ...f, rrule_string: e.target.value || undefined } : f,
                    )
                  }
                  style={inputStyle}
                />
              </label>

              {error && (
                <p style={{ color: "#ef4444", fontSize: 14, margin: 0 }}>
                  {error}
                </p>
              )}

              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
                <button
                  type="button"
                  onClick={() => setAddForm(null)}
                  style={cancelButtonStyle}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createAvailability.isPending}
                  style={primaryButtonStyle}
                >
                  {createAvailability.isPending ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Customer view: read-only booking schedule ─────────────────────────────────

function CustomerCalendar() {
  const { data } = useBookings();

  const events: EventInput[] = (data?.items ?? [])
    .filter((b) => b.status === "CONFIRMED" || b.status === "PENDING")
    .map((b) => ({
      id: b.id,
      title: b.service_type.replace(/_/g, " "),
      start: b.start_at,
      end: b.end_at,
      color: b.status === "CONFIRMED" ? "#6366f1" : "#f59e0b",
      textColor: "white",
    }));

  return (
    <div
      style={{ maxWidth: 1000, margin: "0 auto", padding: 24, fontFamily: "sans-serif" }}
    >
      <h1 style={{ margin: "0 0 20px", fontSize: 24 }}>My Schedule</h1>

      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, rrulePlugin]}
        initialView="timeGridWeek"
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek",
        }}
        events={events}
        height={600}
      />

      <div
        style={{ marginTop: 12, display: "flex", gap: 16, fontSize: 13, color: "#6b7280" }}
      >
        <span>
          <Dot color="#6366f1" /> Confirmed
        </span>
        <span>
          <Dot color="#f59e0b" /> Pending
        </span>
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function Dot({ color }: { color: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: 10,
        height: 10,
        borderRadius: 2,
        background: color,
        marginRight: 4,
        verticalAlign: "middle",
      }}
    />
  );
}

/** Truncate an ISO string to the format required by datetime-local inputs. */
function toDatetimeLocal(iso: string): string {
  return iso.slice(0, 16);
}

const inputStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  marginTop: 4,
  padding: "8px",
  border: "1px solid #d1d5db",
  borderRadius: 6,
  boxSizing: "border-box",
  fontSize: 14,
};

const cancelButtonStyle: React.CSSProperties = {
  padding: "9px 18px",
  border: "1px solid #d1d5db",
  borderRadius: 8,
  background: "white",
  cursor: "pointer",
  fontSize: 14,
};

const primaryButtonStyle: React.CSSProperties = {
  padding: "9px 18px",
  background: "#4f46e5",
  color: "white",
  border: "none",
  borderRadius: 8,
  fontWeight: 600,
  cursor: "pointer",
  fontSize: 14,
};
