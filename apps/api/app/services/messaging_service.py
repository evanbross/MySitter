"""MessagingService: conversation and message persistence."""
import uuid

from fastapi import HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.messaging import Conversation, Message
from app.models.user import User, UserRole

_PAGE_SIZE = 50


class MessagingService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def list_conversations(self, user: User) -> list[Conversation]:
        q = select(Conversation).where(
            or_(Conversation.customer_id == user.id, Conversation.provider_id == user.id)
        )
        return list((await self._db.execute(q)).scalars().all())

    async def get_or_create_conversation(
        self, user: User, provider_id: uuid.UUID
    ) -> Conversation:
        existing = await self._db.scalar(
            select(Conversation).where(
                Conversation.customer_id == user.id,
                Conversation.provider_id == provider_id,
            )
        )
        if existing:
            return existing

        conv = Conversation(customer_id=user.id, provider_id=provider_id)
        self._db.add(conv)
        await self._db.commit()
        await self._db.refresh(conv)
        return conv

    async def get_conversation_for_user(
        self, user: User, conversation_id: uuid.UUID
    ) -> Conversation | None:
        return await self._db.scalar(
            select(Conversation).where(
                Conversation.id == conversation_id,
                or_(
                    Conversation.customer_id == user.id,
                    Conversation.provider_id == user.id,
                ),
            )
        )

    async def get_messages(
        self, user: User, conversation_id: uuid.UUID, before: str | None
    ) -> dict:
        conv = await self.get_conversation_for_user(user, conversation_id)
        if not conv:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

        q = select(Message).where(Message.conversation_id == conversation_id)
        if before:
            q = q.where(Message.id < uuid.UUID(before))

        messages = list(
            (await self._db.execute(q.order_by(Message.created_at.desc()).limit(_PAGE_SIZE)))
            .scalars()
            .all()
        )
        return {
            "items": messages,
            "has_next": len(messages) == _PAGE_SIZE,
        }

    async def send_message(
        self, user: User, conversation_id: uuid.UUID, body: str
    ) -> Message:
        conv = await self.get_conversation_for_user(user, conversation_id)
        if not conv:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

        msg = Message(
            conversation_id=conversation_id,
            sender_id=user.id,
            body=body.strip(),
        )
        self._db.add(msg)
        await self._db.commit()
        await self._db.refresh(msg)
        return msg
