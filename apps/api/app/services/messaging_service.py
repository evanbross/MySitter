"""MessagingService: conversation and message persistence."""
import uuid

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.messaging import Conversation, Message
from app.models.user import User
from app.schemas.messaging import (
    ConversationOut,
    MessageOut,
    MessagesListOut,
    OtherPartyOut,
)

_PAGE_SIZE = 50


class MessagingService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    # ─── Conversations ────────────────────────────────────────────────────────

    async def list_conversations(self, user: User) -> list[ConversationOut]:
        convs = list(
            (
                await self._db.execute(
                    select(Conversation)
                    .where(
                        or_(
                            Conversation.customer_id == user.id,
                            Conversation.provider_id == user.id,
                        )
                    )
                    .order_by(Conversation.created_at.desc())
                )
            )
            .scalars()
            .all()
        )
        # N+1 is acceptable here — conversation counts are small per user.
        # TODO: replace with a single JOIN + subquery if this becomes a hotspot.
        result = []
        for conv in convs:
            result.append(await self._build_conversation_out(conv, user.id))
        return result

    async def get_or_create_conversation(
        self, user: User, provider_id: uuid.UUID
    ) -> ConversationOut:
        existing = await self._db.scalar(
            select(Conversation).where(
                Conversation.customer_id == user.id,
                Conversation.provider_id == provider_id,
            )
        )
        if not existing:
            existing = Conversation(customer_id=user.id, provider_id=provider_id)
            self._db.add(existing)
            await self._db.commit()
            await self._db.refresh(existing)

        return await self._build_conversation_out(existing, user.id)

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

    async def get_conversation_out(
        self, user: User, conversation_id: uuid.UUID
    ) -> ConversationOut | None:
        conv = await self.get_conversation_for_user(user, conversation_id)
        if not conv:
            return None
        return await self._build_conversation_out(conv, user.id)

    async def get_recipient_id(
        self, sender: User, conversation_id: uuid.UUID
    ) -> uuid.UUID | None:
        """Return the conversation participant who is NOT the sender."""
        conv = await self.get_conversation_for_user(sender, conversation_id)
        if not conv:
            return None
        return conv.provider_id if sender.id == conv.customer_id else conv.customer_id

    # ─── Messages ─────────────────────────────────────────────────────────────

    async def get_messages(
        self, user: User, conversation_id: uuid.UUID, before: str | None
    ) -> MessagesListOut:
        conv = await self.get_conversation_for_user(user, conversation_id)
        if not conv:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

        q = select(Message).where(Message.conversation_id == conversation_id)
        if before:
            q = q.where(Message.id < uuid.UUID(before))

        messages = list(
            (
                await self._db.execute(
                    q.order_by(Message.created_at.desc()).limit(_PAGE_SIZE)
                )
            )
            .scalars()
            .all()
        )
        return MessagesListOut(
            items=[MessageOut.model_validate(m) for m in messages],
            has_next=len(messages) == _PAGE_SIZE,
        )

    async def send_message(
        self, user: User, conversation_id: uuid.UUID, body: str
    ) -> MessageOut:
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
        return MessageOut.model_validate(msg)

    # ─── Helpers ──────────────────────────────────────────────────────────────

    async def _build_conversation_out(
        self, conv: Conversation, current_user_id: uuid.UUID
    ) -> ConversationOut:
        other_id = (
            conv.provider_id if current_user_id == conv.customer_id else conv.customer_id
        )
        other = await self._db.scalar(select(User).where(User.id == other_id))
        last_msg = await self._db.scalar(
            select(Message)
            .where(Message.conversation_id == conv.id)
            .order_by(Message.created_at.desc())
            .limit(1)
        )
        unread: int = (
            await self._db.execute(
                select(func.count(Message.id)).where(
                    Message.conversation_id == conv.id,
                    Message.sender_id != current_user_id,
                    Message.read_at.is_(None),
                )
            )
        ).scalar_one()

        return ConversationOut(
            id=conv.id,
            customer_id=conv.customer_id,
            provider_id=conv.provider_id,
            other_party=OtherPartyOut.model_validate(other),
            last_message=MessageOut.model_validate(last_msg) if last_msg else None,
            unread_count=unread,
            created_at=conv.created_at,
        )
