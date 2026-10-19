# =============================================================================
# Copyright (c) 2026 ZombieTech LLC. All rights reserved.
#
# SPDX-License-Identifier: PolyForm-Strict-1.0.0
# See LICENSE in the project root for the full terms.
#
# Licensing inquiries: license@zombietech.biz
# =============================================================================

import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.customer_profile import CustomerProfile
from app.schemas.customer_profile import CustomerProfileUpdateRequest


class CustomerProfileService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def get_by_user_id(self, user_id: uuid.UUID) -> CustomerProfile:
        profile = await self._db.scalar(select(CustomerProfile).where(CustomerProfile.user_id == user_id))
        if not profile:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer profile not found")
        return profile

    async def upsert_by_user_id(
        self, user_id: uuid.UUID, body: CustomerProfileUpdateRequest
    ) -> CustomerProfile:
        profile = await self._db.scalar(select(CustomerProfile).where(CustomerProfile.user_id == user_id))
        if not profile:
            try:
                profile = CustomerProfile(user_id=user_id)
                self._db.add(profile)
                await self._db.flush()
            except IntegrityError:
                # Two concurrent requests raced — roll back and re-fetch the row the other writer created.
                await self._db.rollback()
                profile = await self._db.scalar(select(CustomerProfile).where(CustomerProfile.user_id == user_id))

        payload = body.model_dump(exclude_unset=True)
        for key, value in payload.items():
            setattr(profile, key, value)

        await self._db.commit()
        await self._db.refresh(profile)
        return profile
