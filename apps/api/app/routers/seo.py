# =============================================================================
# Copyright (c) 2026 ZombieTech LLC. All rights reserved.
#
# SPDX-License-Identifier: PolyForm-Strict-1.0.0
# See LICENSE in the project root for the full terms.
#
# Licensing inquiries: license@zombietech.biz
# =============================================================================

"""
SEO router: public, unauthenticated endpoints for search-engine-crawlable pages.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db
from app.schemas.provider import ProviderProfileResponse

router = APIRouter(prefix="/seo", tags=["seo"])


@router.get("/providers/{slug}", response_model=ProviderProfileResponse)
async def get_provider_by_slug(
    slug: str,
    db: AsyncSession = Depends(get_db),
) -> ProviderProfileResponse:
    """Return a provider's public profile by their URL slug. No auth required."""
    from app.services.provider_service import ProviderService

    return await ProviderService(db).get_by_slug(slug)
