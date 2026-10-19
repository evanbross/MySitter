/*!
 * Copyright (c) 2026 ZombieTech LLC. All rights reserved.
 *
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 * See LICENSE in the project root for the full terms.
 *
 * Licensing inquiries: license@zombietech.biz
 */

import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { apiClient } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invalid link</CardTitle>
            <CardDescription>This password-reset link is missing a token.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/login" className="text-sm underline text-slate-700">Back to sign in</Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.auth.confirmPasswordReset(token, password);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[url('/home-background.svg')] bg-cover bg-top px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <p className="text-3xl font-bold text-slate-900">MySitter</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Set a new password</CardTitle>
            <CardDescription>Choose a strong password for your account.</CardDescription>
          </CardHeader>
          <CardContent>
            {done ? (
              <div className="space-y-4 text-center">
                <p className="text-sm text-slate-700">
                  Your password has been updated. You can now sign in with your new password.
                </p>
                <Button className="w-full" onClick={() => navigate("/login")}>
                  Sign in
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">New password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="••••••••"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                  />
                </div>
                {error ? <p className="text-sm text-red-600">{error}</p> : null}
                <Button type="submit" disabled={isSubmitting} className="w-full">
                  {isSubmitting ? "Saving..." : "Set new password"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
        <p className="mt-4 text-center text-sm text-slate-600">
          <Link to="/login" className="font-medium text-slate-900 underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
