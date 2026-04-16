import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Booking, BookingStatus } from "@mysitter/types";
import {
  useBookings,
  useConfirmBooking,
  useCancelBooking,
  useCompleteBooking, // Added
  useCreateReview, // Added
} from "@/hooks/useBookings";
import { useAuth } from "@/hooks/useAuth";

const STATUS_STYLE: Record<BookingStatus, { bg: string; text: string }> = {
  PENDING: { bg: "#fef3c7", text: "#92400e" },
  CONFIRMED: { bg: "#d1fae5", text: "#065f46" },
  CANCELLED: { bg: "#fee2e2", text: "#991b1b" },
  COMPLETED: { bg: "#e0e7ff", text: "#3730a3" },
};

export default function BookingsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, isLoading } = useBookings();
  const confirmBooking = useConfirmBooking();
  const cancelBooking = useCancelBooking();
  const completeBooking = useCompleteBooking(); // Added
  const createReview = useCreateReview(); // Added

  // Added local state for review modal
  const [reviewTarget, setReviewTarget] = useState<{
    bookingId: string;
  } | null>(null);
  const [reviewForm, setReviewForm] = useState({ rating: 5, body: "" });

  if (isLoading) return <div style={{ padding: 24 }}>Loading…</div>;

  const bookings = data?.items ?? [];
  const isProvider = user?.role === "PROVIDER";
  const isUpdating =
    confirmBooking.isPending ||
    cancelBooking.isPending ||
    completeBooking.isPending || // Added
    createReview.isPending; // Added

  return (
    <div
      style={{ maxWidth: 800, margin: "0 auto", padding: 24, fontFamily: "sans-serif" }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <h1 style={{ margin: 0, fontSize: 26 }}>Bookings</h1>
        {!isProvider && (
          <button
            onClick={() => navigate("/search")}
            style={{
              background: "#4f46e5",
              color: "white",
              border: "none",
              borderRadius: 8,
              padding: "10px 18px",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            Find a sitter
          </button>
        )}
      </div>

      {bookings.length === 0 && (
        <p style={{ color: "#6b7280" }}>No bookings yet.</p>
      )}

      {bookings.map((booking) => (
        <BookingCard
          key={booking.id}
          booking={booking}
          isProvider={isProvider}
          onConfirm={() => confirmBooking.mutate(booking.id)}
          onCancel={() => cancelBooking.mutate(booking.id)}
          onComplete={() => completeBooking.mutate(booking.id)} // Added
          onLeaveReview={() =>
            setReviewTarget({ bookingId: booking.id })
          } // Added
          isUpdating={isUpdating}
        />
      ))}

      {/* Review Modal */}
      {reviewTarget && (
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
          onClick={(e) => e.target === e.currentTarget && setReviewTarget(null)}
        >
          <div
            style={{
              background: "white",
              borderRadius: 12,
              padding: 28,
              width: 400,
              maxWidth: "90vw",
            }}
          >
            <h2 style={{ margin: "0 0 16px", fontSize: 20 }}>
              Leave a Review
            </h2>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await createReview.mutateAsync({
                  bookingId: reviewTarget.bookingId,
                  rating: reviewForm.rating,
                  body: reviewForm.body || undefined,
                });
                setReviewTarget(null);
              }}
              style={{ display: "flex", flexDirection: "column", gap: 14 }}
            >
              <label style={{ fontSize: 14, fontWeight: 600 }}>
                Rating (1–5 stars)
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={reviewForm.rating}
                  onChange={(e) =>
                    setReviewForm((f) => ({ ...f, rating: Number(e.target.value) }))
                  }
                  style={{
                    display: "block",
                    width: "100%",
                    marginTop: 4,
                    padding: "8px",
                    border: "1px solid #d1d5db",
                    borderRadius: 6,
                    boxSizing: "border-box",
                  }}
                  required
                />
              </label>
              <label style={{ fontSize: 14, fontWeight: 600 }}>
                Comments (optional)
                <textarea
                  value={reviewForm.body}
                  onChange={(e) =>
                    setReviewForm((f) => ({ ...f, body: e.target.value }))
                  }
                  rows={4}
                  style={{
                    display: "block",
                    width: "100%",
                    marginTop: 4,
                    padding: "8px",
                    border: "1px solid #d1d5db",
                    borderRadius: 6,
                    resize: "vertical",
                    boxSizing: "border-box",
                    fontFamily: "inherit",
                    fontSize: 14,
                  }}
                />
              </label>
              {createReview.isError && (
                <p style={{ color: "#ef4444", fontSize: 13, margin: 0 }}>
                  {createReview.error instanceof Error
                    ? createReview.error.message
                    : "Failed to submit review"}
                </p>
              )}
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setReviewTarget(null)}
                  style={{
                    padding: "10px 20px",
                    border: "1px solid #d1d5db",
                    borderRadius: 8,
                    background: "white",
                    cursor: "pointer",
                    fontSize: 14,
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createReview.isPending}
                  style={{
                    padding: "10px 20px",
                    background: "#4f46e5",
                    color: "white",
                    border: "none",
                    borderRadius: 8,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontSize: 14,
                  }}
                >
                  {createReview.isPending ? "Submitting…" : "Submit Review"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function BookingCard({
  booking,
  isProvider,
  onConfirm,
  onCancel,
  onComplete, // Added
  onLeaveReview, // Added
  isUpdating,
}: {
  booking: Booking;
  isProvider: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  onComplete: () => void; // Added
  onLeaveReview: () => void; // Added
  isUpdating: boolean;
}) {
  const colors = STATUS_STYLE[booking.status];
  const start = new Date(booking.start_at);
  const end = new Date(booking.end_at);
  const sameDay = start.toDateString() === end.toDateString();
  const fmt = (d: Date) =>
    d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 10,
        padding: 16,
        marginBottom: 12,
      }}
    >
      <div
        style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>
            {booking.service_type.replace(/_/g, " ")}
          </div>
          <div style={{ color: "#6b7280", fontSize: 14 }}>
            {start.toLocaleDateString()} {fmt(start)} – {fmt(end)}
            {!sameDay && ` (${end.toLocaleDateString()})`}
          </div>
          {booking.rrule_string && (
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
              Recurring
            </div>
          )}
          {booking.notes && (
            <div
              style={{ fontSize: 14, color: "#374151", marginTop: 6, fontStyle: "italic" }}
            >
              {booking.notes}
            </div>
          )}
        </div>

        <span
          style={{
            background: colors.bg,
            color: colors.text,
            borderRadius: 20,
            padding: "4px 12px",
            fontSize: 12,
            fontWeight: 600,
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          {booking.status}
        </span>
      </div>

      {/* Action buttons — vary by role and status */}
      {booking.status === "PENDING" && isProvider && (
        <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
          <ActionButton
            onClick={onConfirm}
            disabled={isUpdating}
            variant="success"
          >
            Confirm
          </ActionButton>
          <ActionButton
            onClick={onCancel}
            disabled={isUpdating}
            variant="danger"
          >
            Decline
          </ActionButton>
        </div>
      )}

      {booking.status === "PENDING" && !isProvider && (
        <div style={{ marginTop: 12 }}>
          <ActionButton onClick={onCancel} disabled={isUpdating} variant="danger">
            Cancel
          </ActionButton>
        </div>
      )}

      {booking.status === "CONFIRMED" && (
        <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
          <ActionButton onClick={onCancel} disabled={isUpdating} variant="danger">
            Cancel
          </ActionButton>
          {isProvider && (
            <button
              onClick={onComplete}
              disabled={isUpdating}
              style={{
                background: "#059669",
                color: "white",
                border: "none",
                borderRadius: 8,
                padding: "8px 14px",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: 13,
              }}
            >
              Mark Complete
            </button>
          )}
        </div>
      )}

      {booking.status === "COMPLETED" && (
        <div style={{ marginTop: 12 }}>
          <button
            onClick={onLeaveReview}
            style={{
              background: "none",
              border: "1px solid #6366f1",
              color: "#6366f1",
              borderRadius: 8,
              padding: "6px 12px",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            Leave Review
          </button>
        </div>
      )}
    </div>
  );
}

function ActionButton({
  onClick,
  disabled,
  variant,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  variant: "success" | "danger";
  children: React.ReactNode;
}) {
  const styles =
    variant === "success"
      ? { background: "#059669", color: "white", border: "none" }
      : { background: "white", color: "#ef4444", border: "1px solid #fca5a5" };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        ...styles,
        padding: "7px 16px",
        borderRadius: 6,
        cursor: disabled ? "not-allowed" : "pointer",
        fontWeight: 600,
        fontSize: 14,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {children}
    </button>
  );
}
