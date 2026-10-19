# =============================================================================
# Copyright (c) 2026 ZombieTech LLC. All rights reserved.
#
# SPDX-License-Identifier: PolyForm-Strict-1.0.0
# See LICENSE in the project root for the full terms.
#
# Licensing inquiries: license@zombietech.biz
# =============================================================================

"""
ReferralService: generate codes, claim codes on registration, issue rewards.
"""
import secrets
import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.referral import Referral, ReferralStatus
from app.models.user import User
from app.schemas.referral import ReferralListResponse, ReferralResponse


def _generate_code() -> str:
    """8 alphanumeric characters, uppercase. Collision probability negligible."""
    return secrets.token_urlsafe(6)[:8].upper()


class ReferralService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def generate(self, user: User) -> ReferralResponse:
        """
        Create a new referral code for the current user.
        One active (PENDING) code per user is allowed. If one exists, return it.
        """
        existing = await self._db.scalar(
            select(Referral).where(
                Referral.referrer_id == user.id,
                Referral.status == ReferralStatus.PENDING,
            )
        )
        if existing:
            return ReferralResponse.model_validate(existing)

        # Collision retry loop (extremely unlikely — just good practice).
        for _ in range(5):
            code = _generate_code()
            clash = await self._db.scalar(select(Referral).where(Referral.code == code))
            if not clash:
                break
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Could not generate unique referral code",
            )

        referral = Referral(referrer_id=user.id, code=code)
        self._db.add(referral)
        await self._db.commit()
        await self._db.refresh(referral)
        return ReferralResponse.model_validate(referral)

    async def claim(self, code: str, new_user: User) -> ReferralResponse:
        """
        Called during registration when a user supplies a referral code.
        Transitions the referral from PENDING → CLAIMED.
        Raises 404 if code doesn't exist; 409 if already claimed.
        """
        referral = await self._db.scalar(
            select(Referral).where(Referral.code == code.upper())
        )
        if not referral:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Referral code not found",
            )
        if referral.status != ReferralStatus.PENDING:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Referral code has already been used",
            )
        if referral.referrer_id == new_user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You cannot use your own referral code",
            )

        referral.referred_id = new_user.id
        referral.status = ReferralStatus.CLAIMED
        referral.claimed_at = datetime.now(timezone.utc)
        await self._db.commit()
        await self._db.refresh(referral)
        return ReferralResponse.model_validate(referral)

    async def list_for_user(self, user: User) -> ReferralListResponse:
        """Return all referrals created by this user."""
        rows = list(
            (
                await self._db.execute(
                    select(Referral)
                    .where(Referral.referrer_id == user.id)
                    .order_by(Referral.created_at.desc())
                )
            )
            .scalars()
            .all()
        )
        return ReferralListResponse(
            referrals=[ReferralResponse.model_validate(r) for r in rows],
            total_claimed=sum(1 for r in rows if r.status != ReferralStatus.PENDING),
            total_rewarded=sum(1 for r in rows if r.status == ReferralStatus.REWARDED),
        )
