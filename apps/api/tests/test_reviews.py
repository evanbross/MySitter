# =============================================================================
# Copyright (c) 2026 ZombieTech LLC. All rights reserved.
#
# SPDX-License-Identifier: PolyForm-Strict-1.0.0
# See LICENSE in the project root for the full terms.
#
# Licensing inquiries: license@zombietech.biz
# =============================================================================

"""Integration tests for review submission gating."""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_review_requires_completed_booking(
    client: AsyncClient, customer_token: str
) -> None:
    """Submitting a review against a non-existent or non-completed booking returns 404/409."""
    import uuid
    fake_booking_id = str(uuid.uuid4())
    resp = await client.post(
        f"/reviews/bookings/{fake_booking_id}",
        headers={"Authorization": f"Bearer {customer_token}"},
        json={"rating": 5, "body": "Great sitter!"},
    )
    # 404 — booking not found (or 409 if it exists but isn't completed).
    assert resp.status_code in (404, 409)
