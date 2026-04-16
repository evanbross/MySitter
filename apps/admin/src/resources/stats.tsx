import { useEffect, useState } from "react";
import { Title, useNotify } from "react-admin";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";

interface Stats {
  total_users: number;
  active_providers: number;
  total_bookings: number;
  confirmed_bookings: number;
  completed_bookings: number;
  total_subscriptions: number;
  active_subscriptions: number;
  estimated_revenue_usd: number;
}

export function StatsDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const notify = useNotify();

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    fetch(`${import.meta.env.VITE_API_URL}/admin/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(setStats)
      .catch(() => notify("Failed to load stats", { type: "error" }));
  }, [notify]);

  const metrics: Array<[string, string | number]> = stats
    ? [
        ["Total users", stats.total_users],
        ["Active providers", stats.active_providers],
        ["Total bookings", stats.total_bookings],
        ["Confirmed bookings", stats.confirmed_bookings],
        ["Completed bookings", stats.completed_bookings],
        ["Active subscriptions", `${stats.active_subscriptions} / ${stats.total_subscriptions}`],
        ["Est. revenue (USD)", `$${stats.estimated_revenue_usd.toLocaleString()}`],
      ]
    : [];

  return (
    <div style={{ padding: 16 }}>
      <Title title="Platform Stats" />
      <Grid container spacing={2}>
        {metrics.map(([label, value]) => (
          <Grid item xs={12} sm={6} md={4} key={label}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary">
                  {label}
                </Typography>
                <Typography variant="h5" fontWeight={700}>
                  {value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </div>
  );
}
