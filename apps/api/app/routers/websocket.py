# =============================================================================
# Copyright (c) 2026 ZombieTech LLC. All rights reserved.
#
# SPDX-License-Identifier: PolyForm-Strict-1.0.0
# See LICENSE in the project root for the full terms.
#
# Licensing inquiries: license@zombietech.biz
# =============================================================================

"""
WebSocket router for real-time messaging.

Each conversation has a Redis channel `chat:{conversation_id}`.  When a
client sends a message the server persists it, then publishes the
serialised MessageOut to Redis.  A per-connection subscriber task relays
any published frames (from this or any other API instance) back to the
connected client, giving correct horizontal-scaling fan-out.

Online presence is tracked with a Redis key `ws:online:{user_id}` (TTL =
5 min, refreshed on each outbound message).  Other parts of the system
use this key to avoid pushing notifications to already-connected users.
"""
import asyncio
import contextlib
import json
import uuid

from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db
from app.core.redis import get_redis_client
from app.core.security import decode_token

router = APIRouter(tags=["websocket"])

# How long (seconds) a user is considered "online" after their last activity.
_ONLINE_TTL = 300


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
    conversation = await service.get_conversation_for_user(user, conversation_id)
    if not conversation:
        await websocket.close(code=4003)
        return

    channel = f"chat:{conversation_id}"

    # Two Redis clients: one for publish/presence, one dedicated to pub/sub.
    # Using get_redis_client() directly (not via FastAPI Depends) so we can
    # manage their lifecycles explicitly inside this long-lived handler.
    pub_client = get_redis_client()
    sub_client = get_redis_client()
    pubsub = sub_client.pubsub()
    await pubsub.subscribe(channel)

    # Mark user as online for the duration of this connection.
    await pub_client.setex(f"ws:online:{user.id}", _ONLINE_TTL, "1")

    async def _listen_redis() -> None:
        """Relay Redis-published frames to the WebSocket client."""
        async for raw in pubsub.listen():
            if raw["type"] == "message":
                data: bytes = raw["data"]
                await websocket.send_text(data.decode("utf-8"))

    redis_task = asyncio.create_task(_listen_redis())

    try:
        while True:
            data = await websocket.receive_json()
            if data.get("type") == "message":
                body: str = data.get("payload", {}).get("body", "").strip()
                if body:
                    message = await service.send_message(user, conversation_id, body)
                    # Publish to channel — our own subscriber will echo it back,
                    # and any other API instance's subscriber will push to their client.
                    frame = json.dumps(
                        {"type": "message", "payload": json.loads(message.model_dump_json())}
                    )
                    await pub_client.publish(channel, frame)
                    # Refresh online presence on activity.
                    await pub_client.setex(f"ws:online:{user.id}", _ONLINE_TTL, "1")
    except WebSocketDisconnect:
        pass
    finally:
        redis_task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await redis_task
        await pubsub.unsubscribe(channel)
        await pubsub.aclose()
        await sub_client.aclose()
        await pub_client.delete(f"ws:online:{user.id}")
        await pub_client.aclose()
