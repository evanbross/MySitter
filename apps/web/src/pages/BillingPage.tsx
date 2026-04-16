import { useSubscription, usePortalUrl } from "@/hooks/useBilling";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";

const TIERS = [
  {
    id: "BASIC",
    name: "Basic",
    price: "$19/mo",
    features: ["1 service area", "Basic listing"],
  },
  {
    id: "PRO",
    name: "Pro",
    price: "$39/mo",
    features: ["3 service areas", "Priority in search", "Booking calendar", "Analytics"],
  },
  {
    id: "PREMIUM",
    name: "Premium",
    price: "$69/mo",
    features: [
      "Unlimited areas",
      "Top placement",
      "Full analytics dashboard",
      "Referral rewards",
    ],
  },
];

export default function BillingPage() {
  const { user } = useAuth();
  const { data: sub, isLoading } = useSubscription();
  const openPortal = usePortalUrl();

  if (user?.role !== "PROVIDER") {
    return (
      <div style={{ maxWidth: 600, margin: "80px auto", textAlign: "center", padding: 24 }}>
        <h2>Billing</h2>
        <p style={{ color: "#6b7280" }}>
          Subscriptions are only available for provider accounts.
        </p>
      </div>
    );
  }

  if (isLoading) return <div style={{ padding: 32 }}>Loading…</div>;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 32, fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>Subscription &amp; Billing</h1>

      {sub && (
        <div
          style={{
            background: "#f0fdf4",
            border: "1px solid #86efac",
            borderRadius: 10,
            padding: "16px 20px",
            marginBottom: 32,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: "#166534" }}>
              Current plan: {sub.tier}
            </div>
            <div style={{ fontSize: 14, color: "#166534" }}>
              Status: {sub.status} · Renews{" "}
              {new Date(sub.current_period_end).toLocaleDateString()}
            </div>
          </div>
          <button
            onClick={() => openPortal.mutate(window.location.href)}
            disabled={openPortal.isPending}
            style={{
              background: "#4f46e5",
              color: "white",
              border: "none",
              borderRadius: 8,
              padding: "10px 20px",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            {openPortal.isPending ? "Redirecting…" : "Manage Billing"}
          </button>
        </div>
      )}

      {!sub && (
        <p style={{ color: "#6b7280", marginBottom: 32 }}>
          You don't have an active subscription. Choose a plan below to get listed.
        </p>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 20,
        }}
      >
        {TIERS.map((tier) => {
          const isCurrent = sub?.tier === tier.id;
          return (
            <div
              key={tier.id}
              style={{
                border: isCurrent ? "2px solid #4f46e5" : "1px solid #e5e7eb",
                borderRadius: 12,
                padding: 24,
                background: isCurrent ? "#eef2ff" : "white",
              }}
            >
              <h3 style={{ margin: "0 0 4px", fontSize: 20, color: "#111" }}>
                {tier.name}
              </h3>
              <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 16, color: "#374151" }}>
                {tier.price}
              </div>
              <ul style={{ margin: "0 0 20px", paddingLeft: 18 }}>
                {tier.features.map((f) => (
                  <li key={f} style={{ fontSize: 14, color: "#374151", marginBottom: 4 }}>
                    {f}
                  </li>
                ))}
              </ul>
              {isCurrent ? (
                <div style={{ fontSize: 13, fontWeight: 600, color: "#4f46e5" }}>
                  ✓ Your current plan
                </div>
              ) : (
                <Link
                  to={`/billing/checkout?tier=${tier.id}`}
                  style={{
                    display: "inline-block",
                    background: "#4f46e5",
                    color: "white",
                    borderRadius: 8,
                    padding: "10px 20px",
                    textDecoration: "none",
                    fontWeight: 600,
                    fontSize: 14,
                  }}
                >
                  {sub ? "Switch to this plan" : "Get started"}
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
