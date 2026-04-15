"""Locust load test for MySitter API.

Run: locust -f load_tests/locustfile.py --host=http://localhost:8000
"""
from locust import HttpUser, task, between


class MySitterUser(HttpUser):
    """Simulated user for load testing."""

    wait_time = between(1, 3)

    @task(3)
    def search_providers(self):
        """Provider search — most common public endpoint."""
        self.client.get(
            "/providers/search",
            params={"lat": 37.7749, "lng": -122.4194, "radius_miles": 10},
        )

    @task(1)
    def get_provider_profile(self):
        """Get a single provider profile (public)."""
        # Replace with a real provider UUID from your seed data
        self.client.get("/providers/00000000-0000-0000-0000-000000000001")

    @task(2)
    def list_bookings(self):
        """List bookings (authenticated)."""
        if not self.token:
            return
        self.client.get(
            "/bookings",
            headers={"Authorization": f"Bearer {self.token}"},
        )

    def on_start(self):
        """Called when a simulated user starts — login to get a token."""
        # Replace with real test credentials or skip if testing public endpoints only
        try:
            resp = self.client.post(
                "/auth/login",
                json={"email": "test@example.com", "password": "testpass123"},
            )
            if resp.status_code == 200:
                self.token = resp.json()["access_token"]
            else:
                self.token = None
        except Exception:
            self.token = None
