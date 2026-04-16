import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export function NavBar() {
  const { user, logout } = useAuth();
  const location = useLocation();

  // Hide nav on auth pages.
  if (!user) return null;
  if (location.pathname.startsWith("/login") || location.pathname.startsWith("/register")) {
    return null;
  }

  const isProvider = user.role === "PROVIDER";

  // Base links available to all authenticated users.
  const links: Array<{ to: string; label: string }> = [
    { to: "/search", label: "Find Sitters" },
    { to: "/bookings", label: "Bookings" },
    { to: "/messages", label: "Messages" },
    { to: "/referrals", label: "Referrals" },
    { to: "/profile", label: "Account" },
  ];

  // Provider-only links.
  if (isProvider) {
    links.splice(2, 0, { to: "/calendar", label: "Calendar" });
    links.push({ to: "/provider-settings", label: "Sitter Profile" });
    links.push({ to: "/analytics", label: "Analytics" });
    links.push({ to: "/billing", label: "Billing" });
  }

  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "#1a1a2e",
        color: "white",
        display: "flex",
        alignItems: "center",
        padding: "0 24px",
        height: 56,
        gap: 0,
      }}
    >
      {/* Brand */}
      <Link
        to="/search"
        style={{
          color: "white",
          textDecoration: "none",
          fontWeight: 700,
          fontSize: 18,
          marginRight: 32,
          letterSpacing: "-0.5px",
          flexShrink: 0,
        }}
      >
        MySitter
      </Link>

      {/* Route links */}
      <div style={{ display: "flex", gap: 4, flex: 1, overflowX: "auto" }}>
        {links.map(({ to, label }) => {
          const active = location.pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              style={{
                color: active ? "white" : "#94a3b8",
                textDecoration: "none",
                fontSize: 14,
                fontWeight: active ? 600 : 400,
                padding: "6px 12px",
                borderRadius: 6,
                background: active ? "rgba(255,255,255,0.1)" : "transparent",
                whiteSpace: "nowrap",
                transition: "color 0.15s, background 0.15s",
              }}
            >
              {label}
            </Link>
          );
        })}
      </div>

      {/* User identity + sign out */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
        <span style={{ fontSize: 13, color: "#94a3b8" }}>{user.display_name}</span>
        <button
          onClick={() => logout()}
          style={{
            background: "rgba(255,255,255,0.1)",
            border: "none",
            borderRadius: 6,
            color: "white",
            fontSize: 13,
            padding: "6px 12px",
            cursor: "pointer",
          }}
        >
          Sign out
        </button>
      </div>
    </nav>
  );
}
