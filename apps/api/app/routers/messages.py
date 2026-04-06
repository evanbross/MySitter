import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_db
from app.models.user import User

router = APIRouter(prefix="/conversations", tags=["messaging"])


@router.get("")
async def list_conversations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    from app.services.messaging_service import MessagingService
    return await MessagingService(db).list_conversations(current_user)


@router.post("", status_code=201)
async def start_conversation(
    body: dict,  # {"provider_id": "..."}
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    from app.services.messaging_service import MessagingService
    provider_id = uuid.UUID(body["provider_id"])
    return await MessagingService(db).get_or_create_conversation(current_user, provider_id)


@router.get("/{conversation_id}/messages")
async def get_messages(
    conversation_id: uuid.UUID,
    before: str | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    from app.services.messaging_service import MessagingService
    return await MessagingService(db).get_messages(current_user, conversation_id, before)


@router.post("/{conversation_id}/messages", status_code=201)
async def send_message(
    conversation_id: uuid.UUID,
    body: dict,  # {"body": "..."}
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    from app.services.messaging_service import MessagingService
    return await MessagingService(db).send_message(current_user, conversation_id, body["body"])
