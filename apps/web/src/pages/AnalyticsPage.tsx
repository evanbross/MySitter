/*!
 * Copyright (c) 2026 ZombieTech LLC. All rights reserved.
 *
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 * See LICENSE in the project root for the full terms.
 *
 * Licensing inquiries: license@zombietech.biz
 */

import { Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { useProviderAnalytics } from "../hooks/useAnalytics";
import { useAuth } from "../hooks/useAuth";
import { ApiClientError } from "@mysitter/api-client";

export function AnalyticsPage() {
  const { user } = useAuth();
  const { data: analytics, isLoading, error } = useProviderAnalytics();

  if (user?.role !== "PROVIDER") {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <h2 className="text-2xl font-semibold mb-2">Analytics</h2>
        <p className="text-muted-foreground">This page is only available for providers.</p>
      </div>
    );
  }

  if (isLoading) {
    return <div className="p-8">Loading analytics...</div>;
  }

  if (error instanceof ApiClientError && error.status === 402) {
    return (
      <div className="max-w-2xl mx-auto p-8 mt-12 border rounded-lg bg-card text-center shadow-sm">
        <h2 className="text-2xl font-bold mb-4">Upgrade to Pro or Premium</h2>
        <p className="text-muted-foreground mb-8">
          Detailed analytics, including booking trends and completion rates, are available to Pro and Premium subscribers.
        </p>
        <Link
          to="/billing"
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
        >
          View Plans
        </Link>
      </div>
    );
  }

  if (error || !analytics) {
    return <div className="p-8 text-destructive">Failed to load analytics</div>;
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold">Analytics Overview</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
          <h3 className="tracking-tight text-sm font-medium text-muted-foreground">Total Bookings</h3>
          <div className="text-3xl font-bold mt-2">{analytics.total_bookings}</div>
        </div>
        <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
          <h3 className="tracking-tight text-sm font-medium text-muted-foreground">Completion Rate</h3>
          <div className="text-3xl font-bold mt-2">{(analytics.completion_rate * 100).toFixed(1)}%</div>
        </div>
        <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
          <h3 className="tracking-tight text-sm font-medium text-muted-foreground">Unique Customers</h3>
          <div className="text-3xl font-bold mt-2">{analytics.unique_customers}</div>
        </div>
        <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
          <h3 className="tracking-tight text-sm font-medium text-muted-foreground">Average Rating</h3>
          <div className="text-3xl font-bold mt-2">
            {analytics.avg_rating > 0 ? analytics.avg_rating.toFixed(1) : "—"}
            <span className="text-sm font-normal text-muted-foreground ml-2">
              ({analytics.review_count} reviews)
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
        <h3 className="font-semibold mb-6">Weekly Booking Trend (Past 12 Weeks)</h3>
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analytics.weekly_trend}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis 
                dataKey="week_start" 
                tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              />
              <YAxis allowDecimals={false} />
              <Tooltip 
                labelFormatter={(val) => new Date(val).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
              />
              <Legend />
              <Bar dataKey="count" name="Total Requests" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="completed" name="Completed" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
