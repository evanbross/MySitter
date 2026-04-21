import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ApiClientError } from "@mysitter/api-client";
import { useAuth } from "@/hooks/useAuth";
import { usePasskeyAuth } from "@/hooks/usePasskeyAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <p className="text-3xl font-bold text-slate-900">MySitter</p>
          <p className="mt-1 text-sm text-slate-600">Sign in to your account</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Welcome back</CardTitle>
            <CardDescription>Use your email and password to continue.</CardDescription>
          </CardHeader>
          <CardContent>
            {step === "credentials" && (
              <form onSubmit={handleCredentialsSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                {error ? <p className="text-sm text-red-600">{error}</p> : null}
                <Button type="submit" disabled={isLoading} className="w-full">
                  {isLoggingIn ? "Signing in..." : "Sign in"}
                </Button>
                <Button type="button" variant="outline" onClick={handlePasskeyLogin} disabled={isLoading} className="w-full">
                  {isPasskeyPending ? "Waiting for passkey..." : "Sign in with passkey"}
                </Button>
              </form>
            )}

            {step === "totp" && (
              <form onSubmit={handleTotpSubmit} className="space-y-4">
                <p className="text-sm text-slate-600">Enter the 6-digit code from your authenticator app.</p>
                <div className="space-y-2">
                  <Label htmlFor="totp">Code</Label>
                  <Input
                    id="totp"
                    type="text"
                    inputMode="numeric"
                    placeholder="000000"
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value)}
                    maxLength={6}
                    autoFocus
                    required
                  />
                </div>
                {error ? <p className="text-sm text-red-600">{error}</p> : null}
                <Button type="submit" disabled={isLoggingIn} className="w-full">
                  {isLoggingIn ? "Verifying..." : "Verify"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    setStep("credentials");
                    setError(null);
                    setTotpCode("");
                  }}
                >
                  Back
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
        <p className="mt-4 text-center text-sm text-slate-600">
          No account?{" "}
          <Link to="/register" className="font-medium text-slate-900 underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
