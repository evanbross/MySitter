/*!
 * Copyright (c) 2026 ZombieTech LLC. All rights reserved.
 *
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 * See LICENSE in the project root for the full terms.
 *
 * Licensing inquiries: license@zombietech.biz
 */

import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMyProviderProfile } from "@/hooks/useProviderSettings";
import { useCustomerProfile } from "@/hooks/useCustomerProfile";

export default function DashboardPage() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[url('/home-background.svg')] bg-cover bg-top">
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <Card>
        <CardContent className="flex items-center gap-4 pt-6">
          <Avatar className="h-14 w-14 border border-slate-200">
            <AvatarImage src={user.avatar_url ?? ""} alt={user.display_name} />
            <AvatarFallback>{user.display_name.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm text-slate-500">Welcome back</p>
            <h1 className="text-2xl font-semibold text-slate-900">{user.display_name}</h1>
          </div>
        </CardContent>
      </Card>

      {user.role === "CUSTOMER" ? <CustomerDashboard /> : <ProviderDashboard />}
    </div>
    </div>
  );
}

function CustomerDashboard() {
  const customerProfileQuery = useCustomerProfile();
  const hasPets = (customerProfileQuery.data?.pet_names?.length ?? 0) > 0;

  return (
    <>
      <section className="grid gap-4 md:grid-cols-3">
        <QuickActionCard title="Find a sitter" to="/search" />
        <QuickActionCard title="My bookings" to="/bookings" />
        <QuickActionCard title="Messages" to="/messages" />
      </section>

      {!hasPets ? (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-base">Add your pets to help sitters prepare</CardTitle>
          </CardHeader>
          <CardContent>
            <Link to="/profile" className="text-sm font-medium text-amber-900 underline">
              Complete your pet and home profile
            </Link>
          </CardContent>
        </Card>
      ) : null}
    </>
  );
}

function ProviderDashboard() {
  const providerQuery = useMyProviderProfile();
  const profile = providerQuery.data;

  return (
    <>
      <section className="flex items-center gap-3">
        <span className="text-sm text-slate-600">Subscription</span>
        <Badge variant="secondary">{profile?.subscription_tier ?? "BASIC"}</Badge>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <QuickActionCard title="Calendar" to="/calendar" />
        <QuickActionCard title="Bookings" to="/bookings" />
        <QuickActionCard title="Messages" to="/messages" />
        <QuickActionCard title="Analytics" to="/analytics" />
      </section>

      {profile && profile.is_active === false ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6 text-sm text-red-700">
            Your profile is not visible to customers.
          </CardContent>
        </Card>
      ) : null}
    </>
  );
}

function QuickActionCard({ title, to }: { title: string; to: string }) {
  return (
    <Link to={to}>
      <Card className="transition hover:border-slate-300 hover:shadow-md">
        <CardContent className="pt-6">
          <p className="font-medium text-slate-900">{title}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
