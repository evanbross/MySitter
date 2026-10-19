# =============================================================================
# Copyright (c) 2026 ZombieTech LLC. All rights reserved.
#
# SPDX-License-Identifier: PolyForm-Strict-1.0.0
# See LICENSE in the project root for the full terms.
#
# Licensing inquiries: license@zombietech.biz
# =============================================================================

import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

from locust import HttpUser, between, task


def _extract_items(payload: Any) -> list[dict[str, Any]]:
    if isinstance(payload, dict) and isinstance(payload.get("items"), list):
        return [item for item in payload["items"] if isinstance(item, dict)]
    if isinstance(payload, list):
        return [item for item in payload if isinstance(item, dict)]
    return []


class BaseLoadUser(HttpUser):
    wait_time = between(1, 5)
    role = "CUSTOMER"

    def on_start(self) -> None:
        suffix = uuid.uuid4().hex[:8]
        response = self.client.post(
            "/auth/register",
            json={
                "email": f"loadtest_{self.role.lower()}_{suffix}@example.com",
                "password": "LoadTest1!",
                "display_name": f"Load {self.role.title()} {suffix}",
                "role": self.role,
            },
            name="/auth/register",
        )
        if response.status_code == 201:
            payload = response.json()
            token = payload.get("access_token")
            if token:
                self.headers = {"Authorization": f"Bearer {token}"}
                return
        self.headers = {}


class CustomerUser(BaseLoadUser):
    role = "CUSTOMER"

    def __init__(self, *args: Any, **kwargs: Any) -> None:
        super().__init__(*args, **kwargs)
        self.provider_id: str | None = None

    @task(5)
    def search_providers(self) -> None:
        response = self.client.get(
            "/providers/search",
            params={"lat": 40.7128, "lng": -74.0060, "radius_miles": 5, "page": 1},
            headers=self.headers,
            name="/providers/search",
        )
        if response.status_code != 200:
            return
        items = _extract_items(response.json())
        if items:
            provider_id = items[0].get("id")
            if isinstance(provider_id, str):
                self.provider_id = provider_id

    @task(2)
    def view_provider_profile(self) -> None:
        if not self.provider_id:
            return
        self.client.get(
            f"/providers/{self.provider_id}",
            headers=self.headers,
            name="/providers/:id",
        )

    @task(1)
    def create_booking(self) -> None:
        if not self.provider_id or not self.headers:
            return
        now = datetime.now(UTC)
        start_at = (now + timedelta(hours=1)).replace(microsecond=0).isoformat().replace("+00:00", "Z")
        end_at = (now + timedelta(hours=2)).replace(microsecond=0).isoformat().replace("+00:00", "Z")
        self.client.post(
            "/bookings",
            json={
                "provider_id": self.provider_id,
                "service_type": "PET_SITTING",
                "start_at": start_at,
                "end_at": end_at,
            },
            headers=self.headers,
            name="/bookings [POST]",
        )

    @task(2)
    def list_my_bookings(self) -> None:
        if not self.headers:
            return
        self.client.get("/bookings", headers=self.headers, name="/bookings [GET]")

    @task(1)
    def list_conversations(self) -> None:
        if not self.headers:
            return
        self.client.get("/conversations", headers=self.headers, name="/conversations")


class ProviderUser(BaseLoadUser):
    role = "PROVIDER"

    @task(3)
    def list_my_bookings(self) -> None:
        if not self.headers:
            return
        self.client.get("/bookings", headers=self.headers, name="/bookings [GET]")

    @task(1)
    def confirm_pending_booking(self) -> None:
        if not self.headers:
            return
        response = self.client.get(
            "/bookings",
            params={"status": "PENDING", "page": 1},
            headers=self.headers,
            name="/bookings?status=PENDING",
        )
        if response.status_code != 200:
            return
        items = _extract_items(response.json())
        if not items:
            return
        booking_id = items[0].get("id")
        if not isinstance(booking_id, str):
            return
        self.client.post(
            f"/bookings/{booking_id}/confirm",
            headers=self.headers,
            name="/bookings/:id/confirm",
        )

    @task(2)
    def check_analytics(self) -> None:
        if not self.headers:
            return
        # 402 is expected for BASIC tier providers.
        self.client.get("/analytics/me", headers=self.headers, name="/analytics/me")
