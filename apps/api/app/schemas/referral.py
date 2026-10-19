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
from app.models.referral import ReferralStatus


class ReferralResponse(BaseModel):
    id: uuid.UUID
    referrer_id: uuid.UUID
    referred_id: uuid.UUID | None
    code: str
    status: ReferralStatus
    created_at: datetime
    claimed_at: datetime | None
    rewarded_at: datetime | None

    model_config = {"from_attributes": True}


class ReferralListResponse(BaseModel):
    referrals: list[ReferralResponse]
    total_claimed: int
    total_rewarded: int
