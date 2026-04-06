import { useAuth } from "@/hooks/useAuth";

export default function DashboardPage() {
  const { user, logout } = useAuth();
  return (
    <div style={{ padding: 24 }}>
      <h1>Dashboard</h1>
      {user && <p>Welcome, {user.display_name} ({user.role})</p>}
      <button onClick={() => logout()}>Sign out</button>
    </div>
  );
}
