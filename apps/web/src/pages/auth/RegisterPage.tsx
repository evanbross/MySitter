import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Dog, UserRound } from "lucide-react";
import type { UserRole } from "@mysitter/types";
import { apiClient } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<{ email: string; password: string; display_name: string; role: UserRole }>({
    email: "",
    password: "",
    display_name: "",
    role: "CUSTOMER",
  });
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const tokens = await apiClient.auth.register({ ...form });
      localStorage.setItem("access_token", tokens.access_token);
      navigate("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8">
      <div className="w-full max-w-lg">
        <div className="mb-6 text-center">
          <p className="text-3xl font-bold text-slate-900">MySitter</p>
          <p className="mt-1 text-sm text-slate-600">Create your account</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Get started</CardTitle>
            <CardDescription>Choose your account type and set your login details.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="display-name">Display name</Label>
                <Input
                  id="display-name"
                  placeholder="Your name"
                  value={form.display_name}
                  onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Create a password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Account type</Label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, role: "CUSTOMER" })}
                    className={cn(
                      "rounded-lg border p-4 text-left transition",
                      form.role === "CUSTOMER"
                        ? "border-purple-500 bg-purple-50"
                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50",
                    )}
                  >
                    <UserRound className="mb-2 h-5 w-5 text-slate-700" />
                    <p className="font-semibold text-slate-900">I need a sitter</p>
                    <p className="mt-1 text-sm text-slate-600">Find trusted sitters for your pets and home.</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, role: "PROVIDER" })}
                    className={cn(
                      "rounded-lg border p-4 text-left transition",
                      form.role === "PROVIDER"
                        ? "border-purple-500 bg-purple-50"
                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50",
                    )}
                  >
                    <Dog className="mb-2 h-5 w-5 text-slate-700" />
                    <p className="font-semibold text-slate-900">I am a sitter</p>
                    <p className="mt-1 text-sm text-slate-600">Offer pet care services and grow your bookings.</p>
                  </button>
                </div>
              </div>

              {error ? <p className="text-sm text-red-600">{error}</p> : null}
              <Button type="submit" className="w-full">Create account</Button>
            </form>
          </CardContent>
        </Card>
        <p className="mt-4 text-center text-sm text-slate-600">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-slate-900 underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
