/*!
 * Copyright (c) 2026 ZombieTech LLC. All rights reserved.
 *
 * SPDX-License-Identifier: PolyForm-Strict-1.0.0
 * See LICENSE in the project root for the full terms.
 *
 * Licensing inquiries: license@zombietech.biz
 */

import { useMemo, useState } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Link, useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function NavBar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = useMemo(() => {
    if (!user) {
      return [
        { to: "/search", label: "Find Sitters" },
      ];
    }

    const common = [
      { to: "/dashboard", label: "Dashboard" },
      { to: "/search", label: "Find Sitters" },
      { to: "/bookings", label: "Bookings" },
      { to: "/messages", label: "Messages" },
    ];

    if (user.role === "PROVIDER") {
      return [
        ...common,
        { to: "/calendar", label: "Calendar" },
        { to: "/analytics", label: "Analytics" },
      ];
    }

    return common;
  }, [user]);

  if (location.pathname.startsWith("/login") || location.pathname.startsWith("/register")) {
    return null;
  }

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-slate-700 bg-slate-900">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center px-4 md:px-6">
        <Link to="/search" className="shrink-0 text-xl font-bold tracking-tight text-white">
          MySitter
        </Link>

        <div className="mx-6 hidden flex-1 items-center justify-center gap-4 md:flex">
          {links.map(({ to, label }) => {
            const active = location.pathname === to || location.pathname.startsWith(`${to}/`);
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "relative pb-1 text-sm transition-colors",
                  active ? "text-white after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-white/70" : "text-slate-400 hover:text-white",
                )}
              >
                {label}
              </Link>
            );
          })}
        </div>

        <div className="ml-auto hidden items-center gap-3 md:flex">
          {user ? (
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button className="flex items-center gap-2 rounded-md px-2 py-1 text-left hover:bg-slate-800">
                  <Avatar className="h-8 w-8 border border-slate-700">
                    <AvatarImage src={user.avatar_url ?? ""} alt={user.display_name} />
                    <AvatarFallback className="bg-slate-700 text-xs text-slate-200">
                      {initials(user.display_name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-slate-200">{user.display_name}</span>
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content className="z-50 min-w-[180px] rounded-md border border-slate-200 bg-white p-1 shadow-md" align="end">
                  <DropdownMenu.Item asChild>
                    <Link to="/profile" className="block rounded px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-100">
                      Account Settings
                    </Link>
                  </DropdownMenu.Item>
                  <DropdownMenu.Separator className="my-1 h-px bg-slate-200" />
                  <DropdownMenu.Item
                    className="rounded px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
                    onSelect={() => logout()}
                  >
                    Sign out
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          ) : (
            <>
              <Button variant="ghost" asChild className="text-slate-200 hover:bg-slate-800 hover:text-white">
                <Link to="/login">Sign In</Link>
              </Button>
              <Button variant="outline" asChild className="border-slate-500 bg-transparent text-slate-100 hover:bg-slate-800">
                <Link to="/register">Register</Link>
              </Button>
            </>
          )}
        </div>

        <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="ml-auto text-slate-200 hover:bg-slate-800 md:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Open menu</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[92vw] rounded-lg p-4">
            <DialogHeader className="mb-2">
              <DialogTitle className="text-slate-900">Navigation</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-2">
              {links.map(({ to, label }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "rounded-md px-3 py-2 text-sm",
                    location.pathname.startsWith(to) ? "bg-slate-100 font-medium text-slate-900" : "text-slate-600 hover:bg-slate-50",
                  )}
                >
                  {label}
                </Link>
              ))}
            </div>
            <div className="mt-4 border-t border-slate-200 pt-4">
              {user ? (
                <div className="space-y-3">
                  <div className="text-sm text-slate-600">{user.display_name}</div>
                  <div className="flex gap-2">
                    <Button className="flex-1" variant="outline" asChild>
                      <Link to="/profile" onClick={() => setMobileOpen(false)}>
                        Account Settings
                      </Link>
                    </Button>
                    <Button variant="outline" onClick={() => logout()}>
                      Sign out
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button className="flex-1" asChild>
                    <Link to="/login" onClick={() => setMobileOpen(false)}>
                      Sign In
                    </Link>
                  </Button>
                  <Button className="flex-1" variant="outline" asChild>
                    <Link to="/register" onClick={() => setMobileOpen(false)}>
                      Register
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </nav>
  );
}
