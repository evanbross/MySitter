import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ApiClientError } from "@mysitter/api-client";
import { useAuth } from "@/hooks/useAuth";
import { usePasskeyAuth } from "@/hooks/usePasskeyAuth";

type Step = "credentials" | "totp";

function isTotpRequired(err: Error): boolean {
  return (
    err instanceof ApiClientError &&
    err.status === 422 &&
    typeof err.error.detail === "string" &&
    err.error.detail.includes("TOTP")
  );
}

export default function LoginPage() {
  const { login, isLoggingIn } = useAuth();
  const { loginWithPasskey, isPending: isPasskeyPending } = usePasskeyAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isLoading = isLoggingIn || isPasskeyPending;

  function handleCredentialsSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    login(
      { email, password },
      {
        onSuccess: () => navigate("/dashboard"),
        onError: (err) => {
          // Backend returns 422 with "TOTP code required" when the account has TOTP enabled.
          // ApiClientError is a subclass of Error, so instanceof narrows correctly.
          if (isTotpRequired(err)) {
            setStep("totp");
          } else {
            setError(err.message);
          }
        },
      },
    );
  }

  function handleTotpSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    login(
      { email, password, totpCode },
      {
        onSuccess: () => navigate("/dashboard"),
        onError: (err) => setError(err.message),
      },
    );
  }

  function handlePasskeyLogin() {
    if (!email) {
      setError("Enter your email address first, then click Sign in with passkey.");
      return;
    }
    setError(null);
    loginWithPasskey(email, {
      onSuccess: () => navigate("/dashboard"),
      onError: (err) => setError(err.message),
    });
  }

  return (
    <div style={{ maxWidth: 400, margin: "80px auto", padding: 24 }}>
      <h1>Sign in to mysitter</h1>

      {step === "credentials" && (
        <form
          onSubmit={handleCredentialsSubmit}
          style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 12 }}
        >
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <p style={{ color: "red" }}>{error}</p>}
          <button type="submit" disabled={isLoading}>
            {isLoggingIn ? "Signing in…" : "Sign in"}
          </button>
          <button type="button" onClick={handlePasskeyLogin} disabled={isLoading}>
            {isPasskeyPending ? "Waiting for passkey…" : "Sign in with passkey"}
          </button>
        </form>
      )}

      {step === "totp" && (
        <form
          onSubmit={handleTotpSubmit}
          style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 12 }}
        >
          <p>Enter the 6-digit code from your authenticator app.</p>
          <input
            type="text"
            inputMode="numeric"
            placeholder="000000"
            value={totpCode}
            onChange={(e) => setTotpCode(e.target.value)}
            maxLength={6}
            autoFocus
            required
          />
          {error && <p style={{ color: "red" }}>{error}</p>}
          <button type="submit" disabled={isLoggingIn}>
            {isLoggingIn ? "Verifying…" : "Verify"}
          </button>
          <button
            type="button"
            onClick={() => {
              setStep("credentials");
              setError(null);
              setTotpCode("");
            }}
          >
            Back
          </button>
        </form>
      )}

      <p style={{ marginTop: 16 }}>
        No account? <Link to="/register">Register</Link>
      </p>
    </div>
  );
}
