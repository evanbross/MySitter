import { useNavigate } from "react-router-dom";
import type { Booking, BookingStatus } from "@mysitter/types";
import { useBookings, useConfirmBooking, useCancelBooking } from "@/hooks/useBookings";
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

  if (isLoading) return <div style={{ padding: 24 }}>Loading…</div>;

  const bookings = data?.items ?? [];
  const isProvider = user?.role === "PROVIDER";
  const isUpdating = confirmBooking.isPending || cancelBooking.isPending;

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
          isUpdating={isUpdating}
        />
      ))}
    </div>
  );
}

function BookingCard({
  booking,
  isProvider,
  onConfirm,
  onCancel,
  isUpdating,
}: {
  booking: Booking;
  isProvider: boolean;
  onConfirm: () => void;
  onCancel: () => void;
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
        <div style={{ marginTop: 12 }}>
          <ActionButton onClick={onCancel} disabled={isUpdating} variant="danger">
            Cancel
          </ActionButton>
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
