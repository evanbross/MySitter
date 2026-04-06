"""
Admin router: all routes require ADMIN role.
React Admin connects to these endpoints via its data provider.
"""
import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, require_role
from app.models.user import User, UserRole
from app.schemas.user import UserResponse, UserUpdateRequest

router = APIRouter(prefix="/admin", tags=["admin"])

_admin_only = require_role(UserRole.ADMIN)


@router.get("/users", response_model=list[UserResponse])
async def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    _: User = Depends(_admin_only),
    db: AsyncSession = Depends(get_db),
) -> list[User]:
    offset = (page - 1) * page_size
    result = await db.execute(select(User).offset(offset).limit(page_size))
    return list(result.scalars().all())


@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: uuid.UUID,
    _: User = Depends(_admin_only),
    db: AsyncSession = Depends(get_db),
) -> User:
    from fastapi import HTTPException, status
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    return user


@router.patch("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: uuid.UUID,
    body: UserUpdateRequest,
    _: User = Depends(_admin_only),
    db: AsyncSession = Depends(get_db),
) -> User:
    from fastapi import HTTPException, status
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(user, field, value)
    await db.commit()
    await db.refresh(user)
    return user


@router.post("/users/{user_id}/deactivate", response_model=UserResponse)
async def deactivate_user(
    user_id: uuid.UUID,
    _: User = Depends(_admin_only),
    db: AsyncSession = Depends(get_db),
) -> User:
    from fastapi import HTTPException, status
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    user.is_active = False
    await db.commit()
    await db.refresh(user)
    return user


@router.get("/stats")
async def get_stats(
    _: User = Depends(_admin_only),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """High-level platform statistics for the admin dashboard."""
    total_users = await db.scalar(select(func.count(User.id)))
    providers = await db.scalar(
        select(func.count(User.id)).where(User.role == UserRole.PROVIDER)
    )
    customers = await db.scalar(
        select(func.count(User.id)).where(User.role == UserRole.CUSTOMER)
    )
    return {
        "total_users": total_users,
        "providers": providers,
        "customers": customers,
    }
