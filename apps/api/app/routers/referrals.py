from fastapi import APIRouter, Depends, Path
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.referral import ReferralListResponse, ReferralResponse
from app.services.referral_service import ReferralService

router = APIRouter(prefix="/referrals", tags=["referrals"])


@router.post("/generate", response_model=ReferralResponse, status_code=201)
async def generate_referral_code(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ReferralResponse:
    """Generate a new referral code for the current user (idempotent — returns existing PENDING code)."""
    return await ReferralService(db).generate(current_user)


@router.post("/claim/{code}", response_model=ReferralResponse)
async def claim_referral_code(
    code: str = Path(..., min_length=1, max_length=16),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ReferralResponse:
    """Claim a referral code during or after registration."""
    return await ReferralService(db).claim(code, current_user)


@router.get("/me", response_model=ReferralListResponse)
async def my_referrals(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ReferralListResponse:
    """List all referrals created by the current user."""
    return await ReferralService(db).list_for_user(current_user)
