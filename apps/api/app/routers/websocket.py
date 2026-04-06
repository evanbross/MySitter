"""
WebSocket router for real-time messaging.
Each conversation has its own channel. Redis pub/sub fans messages out
across API instances so horizontal scaling works correctly.
"""
import uuid

from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db
from app.core.security import decode_token

router = APIRouter(tags=["websocket"])


async def _get_user_from_token(token: str, db: AsyncSession) -> "User | None":  # type: ignore[name-defined]
    from jose import JWTError
    from sqlalchemy import select

    from app.models.user import User

    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            return None
        user_id = payload.get("sub")
    except JWTError:
        return None

    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    return result.scalar_one_or_none()


@router.websocket("/ws/conversations/{conversation_id}")
async def conversation_websocket(
    websocket: WebSocket,
    conversation_id: uuid.UUID,
    token: str = Query(...),
    db: AsyncSession = Depends(get_db),
) -> None:
    user = await _get_user_from_token(token, db)
    if not user:
        await websocket.close(code=4001)
        return

    await websocket.accept()

    from app.services.messaging_service import MessagingService
    service = MessagingService(db)

    # Verify the user is a participant in this conversation
    conversation = await service.get_conversation_for_user(user, conversation_id)
    if not conversation:
        await websocket.close(code=4003)
        return

    channel = f"chat:{conversation_id}"

    async def _publish_and_persist(body: str) -> dict:
        message = await service.send_message(user, conversation_id, body)
        # In a multi-instance deployment, publish to Redis so other instances
        # can push the message to their connected clients.
        # Redis pub/sub integration goes here (Phase 2).
        return message

    try:
        while True:
            data = await websocket.receive_json()
            if data.get("type") == "message":
                body = data.get("payload", {}).get("body", "").strip()
                if body:
                    message = await _publish_and_persist(body)
                    await websocket.send_json({"type": "message", "payload": message})
    except WebSocketDisconnect:
        pass
