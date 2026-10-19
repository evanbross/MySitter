# =============================================================================
# Copyright (c) 2026 ZombieTech LLC. All rights reserved.
#
# SPDX-License-Identifier: PolyForm-Strict-1.0.0
# See LICENSE in the project root for the full terms.
#
# Licensing inquiries: license@zombietech.biz
# =============================================================================

import uuid
from datetime import datetime

from pydantic import BaseModel


class SubscribeRequest(BaseModel):
    tier: str  # "BASIC" | "PRO" | "PREMIUM"


class SubscribeResponse(BaseModel):
    client_secret: str


class SubscriptionResponse(BaseModel):
    id: uuid.UUID
    provider_id: uuid.UUID
    stripe_subscription_id: str
    tier: str
    status: str
    current_period_end: datetime

    model_config = {"from_attributes": True}
