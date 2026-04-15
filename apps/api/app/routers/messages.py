import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

import redis.asyncio as aioredis

from app.core.deps import get_current_user, get_db, get_redis
from app.models.user import User
from app.schemas.messaging import (
    ConversationOut,
    MessageOut,
    MessagesListOut,
    SendMessageRequest,
    StartConversationRequest,
)
from app.services.messaging_service import MessagingService

router = APIRouter(prefix="/conversations", tags=["messaging"])


@router.get("", response_model=list[ConversationOut])
async def list_conversations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[ConversationOut]:
    return await MessagingService(db).list_conversations(current_user)


@router.post("", response_model=ConversationOut, status_code=201)
async def start_conversation(
    body: StartConversationRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ConversationOut:
    return await MessagingService(db).get_or_create_conversation(
        current_user, body.provider_id
    )


@router.get("/{conversation_id}", response_model=ConversationOut)
async def get_conversation(
    conversation_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ConversationOut:
    from fastapi import HTTPException, status

    result = await MessagingService(db).get_conversation_out(current_user, conversation_id)
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    return result


@router.get("/{conversation_id}/messages", response_model=MessagesListOut)
async def get_messages(
    conversation_id: uuid.UUID,
    before: str | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MessagesListOut:
    return await MessagingService(db).get_messages(current_user, conversation_id, before)


@router.post(
    "/{conversation_id}/messages",
    response_model=MessageOut,
    status_code=201,
)
async def send_message(
    conversation_id: uuid.UUID,
    body: SendMessageRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    redis: aioredis.Redis = Depends(get_redis),
) -> MessageOut:
    service = MessagingService(db)
    message = await service.send_message(current_user, conversation_id, body.body)

    # Dispatch a push notification if the recipient has no active WebSocket connection.
    recipient_id = await service.get_recipient_id(current_user, conversation_id)
    if recipient_id and not await redis.exists(f"ws:online:{recipient_id}"):
        from app.workers.tasks import notify_new_message

        notify_new_message.delay(str(message.id))

    return message
