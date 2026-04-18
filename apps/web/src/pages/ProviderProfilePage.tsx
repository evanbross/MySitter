import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import rrulePlugin from "@fullcalendar/rrule";
import type { EventInput } from "@fullcalendar/core";
import type { Review, ServiceType, ProviderProfile } from "@mysitter/types";
import {
  useProviderProfile,
  useProviderProfileBySlug,
  useProviderAvailability,
  useProviderReviews, // Added
} from "@/hooks/useProviders";
import { useCreateBooking } from "@/hooks/useBookings";
import { useAuth } from "@/hooks/useAuth";
import SeoHead from "@/components/SeoHead";

const SERVICE_TYPES: ServiceType[] = [
  "PET_SITTING",
  "HOUSE_SITTING",
  "DOG_WALKING",
  "DROP_IN_VISIT",
  "DOGGY_DAY_CARE",
  "BOARDING",
];

interface BookingFormState {
  service_type: ServiceType;
  start_at: string;
  end_at: string;
  notes: string;
}

function JsonLdPerson({
  profile,
  seoUrl,
}: {
  profile: ProviderProfile;
  seoUrl: string;
}) {
  const data = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: profile.display_name,
    url: seoUrl,
    description: profile.bio ?? undefined,
    image: profile.avatar_url ?? undefined,
    ...(profile.hourly_rate != null && {
      makesOffer: {
        "@type": "Offer",
        priceSpecification: {
          "@type": "UnitPriceSpecification",
          price: profile.hourly_rate,
          priceCurrency: "USD",
          unitText: "HOUR",
        },
      },
    }),
    aggregateRating:
      profile.rating != null && profile.review_count > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: profile.rating.toFixed(1),
            reviewCount: profile.review_count,
            bestRating: 5,
            worstRating: 1,
          }
        : undefined,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export default function ProviderProfilePage() {
  const { providerId, slug } = useParams<{ providerId?: string; slug?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: profileById, isLoading: loadingById } = useProviderProfile(providerId);
  const { data: profileBySlug, isLoading: loadingBySlug } = useProviderProfileBySlug(slug);
  const isLoading = loadingById || loadingBySlug;
  const profile = profileById ?? profileBySlug;

  const resolvedId = profile?.id;
  const { data: availability } = useProviderAvailability(resolvedId);
  const createBooking = useCreateBooking();

  const [showModal, setShowModal] = useState(false);
  // Review pagination state — declared before early returns so hook rules are satisfied.
  const [reviewPage, setReviewPage] = useState(1);
  const [allReviews, setAllReviews] = useState<Review[]>([]);
  const [bookingForm, setBookingForm] = useState<BookingFormState>({
    service_type: "PET_SITTING",
    start_at: "",
    end_at: "",
    notes: "",
  });
  const [bookingError, setBookingError] = useState<string | null>(null);

  const { data: reviewsData } = useProviderReviews(resolvedId, reviewPage);

  // Append incoming review pages into accumulatedReviews. Reset when the provider
  // changes so stale reviews from the previous profile are not shown.
  useEffect(() => {
    if (!reviewsData) return;
    setAllReviews((prev) =>
      reviewPage === 1 ? reviewsData.items : [...prev, ...reviewsData.items],
    );
  }, [reviewsData, reviewPage]);

  // When navigating to a different provider, reset pagination.
  useEffect(() => {
    setReviewPage(1);
    setAllReviews([]);
  }, [resolvedId]);

  if (isLoading) return <div style={{ padding: 24 }}>Loading…</div>;
  if (!profile) return <div style={{ padding: 24 }}>Provider not found.</div>;
  const isOwnProviderProfile = user?.role === "PROVIDER" && user.id === profile.user_id;

  const calendarEvents: EventInput[] = (availability ?? []).map((a) => {
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

  async function handleBook(e: React.FormEvent) {
    e.preventDefault();
    setBookingError(null);

    if (!user) {
      navigate("/login");
      return;
    }

    try {
      await createBooking.mutateAsync({
        provider_id: profile!.id,
        service_type: bookingForm.service_type,
        start_at: new Date(bookingForm.start_at).toISOString(),
        end_at: new Date(bookingForm.end_at).toISOString(),
        notes: bookingForm.notes || undefined,
      });
      setShowModal(false);
      navigate("/bookings");
    } catch (err) {
      setBookingError(err instanceof Error ? err.message : "Booking failed");
    }
  }

  const seoTitle = profile.display_name
    ? `${profile.display_name} — mysitter`
    : "Provider Profile — mysitter";
  const seoDescription = profile.bio
    ? profile.bio.slice(0, 160)
    : `Book ${profile.display_name ?? "this provider"} on mysitter for pet sitting, dog walking, and more.`;
  const seoUrl = profile.slug
    ? `${window.location.origin}/sitters/${profile.slug}`
    : window.location.href;

  return (
    <div
      style={{ maxWidth: 900, margin: "0 auto", padding: 24, fontFamily: "sans-serif" }}
    >
      <SeoHead
        title={seoTitle}
        description={seoDescription}
        image={profile.avatar_url ?? undefined}
        canonicalUrl={seoUrl}
      />
      <JsonLdPerson profile={profile} seoUrl={seoUrl} />

      {/* Inactive provider banner */}
      {!profile.is_active && (
        <div
          style={{
            background: "#fef3c7",
            border: "1px solid #f59e0b",
            borderRadius: 8,
            padding: "12px 16px",
            marginBottom: 24,
            color: "#92400e",
            fontWeight: 500,
          }}
        >
          This provider is currently not accepting bookings.
        </div>
      )}

      {/* ── Profile header ───────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 20, marginBottom: 32, flexWrap: "wrap" }}>
        {profile.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={profile.display_name}
            style={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              objectFit: "cover",
              flexShrink: 0,
            }}
          />
        ) : (
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              background: "#e0e7ff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 32,
              fontWeight: 700,
              color: "#4f46e5",
              flexShrink: 0,
            }}
          >
            {profile.display_name[0]}
          </div>
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ margin: "0 0 4px", fontSize: 28 }}>{profile.display_name}</h1>
          {profile.rating != null && (
            <div style={{ color: "#f59e0b", marginBottom: 4 }}>
              ★ {profile.rating.toFixed(1)} · {profile.review_count} review
              {profile.review_count !== 1 ? "s" : ""}
            </div>
          )}
          {profile.hourly_rate != null && (
            <div style={{ fontSize: 18, fontWeight: 600, color: "#374151" }}>
              ${profile.hourly_rate}/hr
            </div>
          )}
          <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
            {profile.services.map((s) => (
              <span
                key={s}
                style={{
                  background: "#e0e7ff",
                  color: "#3730a3",
                  borderRadius: 6,
                  padding: "3px 10px",
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                {s.replace(/_/g, " ")}
              </span>
            ))}
          </div>
        </div>

        {!isOwnProviderProfile && (
          <div style={{ flexShrink: 0 }}>
            <button
              onClick={() => setShowModal(true)}
              disabled={!profile.is_active}
              style={{
                background: profile.is_active ? "#4f46e5" : "#9ca3af",
                color: "white",
                border: "none",
                borderRadius: 8,
                padding: "12px 24px",
                fontSize: 16,
                fontWeight: 600,
                cursor: profile.is_active ? "pointer" : "not-allowed",
              }}
            >
              {profile.is_active ? "Book this sitter" : "Not available"}
            </button>
          </div>
        )}
      </div>

      {/* ── Bio ─────────────────────────────────────────────────────────── */}
      {profile.bio && (
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 18, margin: "0 0 8px" }}>About</h2>
          <p style={{ color: "#374151", lineHeight: 1.7, margin: 0 }}>
            {profile.bio}
          </p>
        </div>
      )}

      {/* ── Availability calendar ────────────────────────────────────────── */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, margin: "0 0 12px" }}>Availability</h2>
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, rrulePlugin]}
          initialView="timeGridWeek"
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek",
          }}
          events={calendarEvents}
          height={400}
        />
      </div>

      {/* ── Reviews ──────────────────────────────────────────────────── */}
      {reviewsData && reviewsData.total > 0 && (
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, margin: "0 0 16px" }}>
            Reviews ({reviewsData.total})
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {allReviews.map((review) => (
              <div
                key={review.id}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 10,
                  padding: "14px 16px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 6,
                  }}
                >
                  <span style={{ color: "#f59e0b", fontSize: 16 }}>
                    {"★".repeat(review.rating)}
                    <span style={{ color: "#d1d5db" }}>
                      {"★".repeat(5 - review.rating)}
                    </span>
                  </span>
                  <span style={{ fontSize: 13, color: "#6b7280" }}>
                    {new Date(review.created_at).toLocaleDateString()}
                  </span>
                </div>
                {review.body && (
                  <p style={{ margin: 0, color: "#374151", lineHeight: 1.6 }}>
                    {review.body}
                  </p>
                )}
              </div>
            ))}
          </div>
          {reviewsData.has_next && (
            <button
              onClick={() => setReviewPage((p) => p + 1)}
              style={{
                marginTop: 16,
                background: "none",
                border: "1px solid #d1d5db",
                borderRadius: 8,
                padding: "8px 16px",
                cursor: "pointer",
                fontSize: 14,
                color: "#374151",
              }}
            >
              Load more reviews
            </button>
          )}
        </div>
      )}

      {/* ── Booking modal ────────────────────────────────────────────────── */}
      {showModal && !isOwnProviderProfile && (
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
          onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
        >
          <div
            style={{
              background: "white",
              borderRadius: 12,
              padding: 28,
              width: 420,
              maxWidth: "90vw",
            }}
          >
            <h2 style={{ margin: "0 0 20px", fontSize: 20 }}>
              Book {profile.display_name}
            </h2>
            <form
              onSubmit={handleBook}
              style={{ display: "flex", flexDirection: "column", gap: 14 }}
            >
              <label style={{ fontSize: 14, fontWeight: 600 }}>
                Service type
                <select
                  value={bookingForm.service_type}
                  onChange={(e) =>
                    setBookingForm((f) => ({
                      ...f,
                      service_type: e.target.value as ServiceType,
                    }))
                  }
                  style={{
                    display: "block",
                    width: "100%",
                    marginTop: 4,
                    padding: "8px",
                    border: "1px solid #d1d5db",
                    borderRadius: 6,
                    fontSize: 14,
                  }}
                  required
                >
                  {SERVICE_TYPES.map((s) => (
                    <option key={s} value={s}>
                      {s.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </label>

              <label style={{ fontSize: 14, fontWeight: 600 }}>
                Start
                <input
                  type="datetime-local"
                  value={bookingForm.start_at}
                  onChange={(e) =>
                    setBookingForm((f) => ({ ...f, start_at: e.target.value }))
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
                End
                <input
                  type="datetime-local"
                  value={bookingForm.end_at}
                  onChange={(e) =>
                    setBookingForm((f) => ({ ...f, end_at: e.target.value }))
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
                Notes (optional)
                <textarea
                  value={bookingForm.notes}
                  onChange={(e) =>
                    setBookingForm((f) => ({ ...f, notes: e.target.value }))
                  }
                  rows={3}
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

              {bookingError && (
                <p style={{ color: "#ef4444", fontSize: 14, margin: 0 }}>
                  {bookingError}
                </p>
              )}

              <div
                style={{
                  display: "flex",
                  gap: 10,
                  justifyContent: "flex-end",
                  marginTop: 4,
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
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
                  disabled={createBooking.isPending}
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
                  {createBooking.isPending ? "Booking…" : "Confirm booking"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
