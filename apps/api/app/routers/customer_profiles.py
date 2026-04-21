from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_db
from app.models.user import User, UserRole
from app.schemas.customer_profile import CustomerProfileResponse, CustomerProfileUpdateRequest
from app.services.customer_profile_service import CustomerProfileService

router = APIRouter(prefix="/customer-profile", tags=["customer-profile"])


def _ensure_customer_role(current_user: User) -> None:
    if current_user.role != UserRole.CUSTOMER:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Customer role required")


@router.get("", response_model=CustomerProfileResponse, status_code=status.HTTP_200_OK)
async def get_customer_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CustomerProfileResponse:
    _ensure_customer_role(current_user)
    service = CustomerProfileService(db)
    return await service.get_by_user_id(current_user.id)


@router.put("", response_model=CustomerProfileResponse, status_code=status.HTTP_200_OK)
async def upsert_customer_profile(
    body: CustomerProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CustomerProfileResponse:
    _ensure_customer_role(current_user)
    service = CustomerProfileService(db)
    return await service.upsert_by_user_id(current_user.id, body)
