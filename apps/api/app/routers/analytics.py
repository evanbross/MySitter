# =============================================================================
# Copyright (c) 2026 ZombieTech LLC. All rights reserved.
#
# SPDX-License-Identifier: PolyForm-Strict-1.0.0
# See LICENSE in the project root for the full terms.
#
# Licensing inquiries: license@zombietech.biz
# =============================================================================

import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.deps import get_current_user, get_db
from app.models.provider import ProviderProfile, SubscriptionTier
from app.models.user import User
from app.schemas.analytics import ProviderAnalytics
from app.services.analytics_service import AnalyticsService

router = APIRouter(prefix="/analytics", tags=["analytics"])

async def require_pro_or_premium(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> tuple[User, ProviderProfile]:
    profile = await db.scalar(
        select(ProviderProfile).where(ProviderProfile.user_id == current_user.id)
    )
    if not profile or profile.subscription_tier not in (SubscriptionTier.PRO, SubscriptionTier.PREMIUM):
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Analytics require a Pro or Premium subscription"
        )
    return current_user, profile

@router.get("/me", response_model=ProviderAnalytics)
async def get_my_analytics(
    user_and_profile: tuple[User, ProviderProfile] = Depends(require_pro_or_premium),
    db: AsyncSession = Depends(get_db),
) -> ProviderAnalytics:
    _, profile = user_and_profile
    return await AnalyticsService(db).get_provider_analytics(profile.id)
