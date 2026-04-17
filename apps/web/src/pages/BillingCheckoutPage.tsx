import { useEffect, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { apiClient } from "@/lib/apiClient";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? "");

export default function BillingCheckoutPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tier = searchParams.get("tier") ?? "";
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Guard against React StrictMode double-invocation and back-navigation re-mounts
  // creating duplicate Stripe PaymentIntents.
  const subscribeCalled = useRef(false);

  useEffect(() => {
    if (!tier) {
      navigate("/billing");
      return;
    }
    if (subscribeCalled.current) return;
    subscribeCalled.current = true;
    apiClient.billing
      .subscribe(tier)
      .then((res) => setClientSecret(res.client_secret))
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Failed to start checkout"),
      );
  }, [tier, navigate]);

  if (error) {
    return (
      <div style={{ maxWidth: 480, margin: "80px auto", padding: 24 }}>
        <h2>Checkout error</h2>
        <p style={{ color: "#ef4444" }}>{error}</p>
        <button onClick={() => navigate("/billing")} style={btnStyle}>
          Back to plans
        </button>
      </div>
    );
  }

  if (!clientSecret) {
    return <div style={{ padding: 32, textAlign: "center" }}>Setting up checkout…</div>;
  }

  return (
    <div style={{ maxWidth: 480, margin: "60px auto", padding: 24, fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>Complete your subscription</h1>
      <p style={{ color: "#6b7280", marginBottom: 24, fontSize: 14 }}>
        You're subscribing to the <strong>{tier}</strong> plan.
      </p>
      <Elements stripe={stripePromise} options={{ clientSecret }}>
        <CheckoutForm tier={tier} />
      </Elements>
    </div>
  );
}

function CheckoutForm({ tier }: { tier: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setSubmitting(true);
    setError(null);

    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/billing?subscribed=${tier}`,
      },
    });

    // confirmPayment only returns here on error — success redirects to return_url.
    if (stripeError) {
      setError(stripeError.message ?? "Payment failed");
    }
    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <PaymentElement />
      {error && <p style={{ color: "#ef4444", fontSize: 14, margin: 0 }}>{error}</p>}
      <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
        <button
          type="button"
          onClick={() => navigate("/billing")}
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
          disabled={!stripe || submitting}
          style={btnStyle}
        >
          {submitting ? "Processing…" : "Subscribe"}
        </button>
      </div>
    </form>
  );
}

const btnStyle: React.CSSProperties = {
  background: "#4f46e5",
  color: "white",
  border: "none",
  borderRadius: 8,
  padding: "10px 20px",
  fontWeight: 600,
  fontSize: 14,
  cursor: "pointer",
};
