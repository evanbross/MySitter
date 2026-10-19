# =============================================================================
# Copyright (c) 2026 ZombieTech LLC. All rights reserved.
#
# SPDX-License-Identifier: PolyForm-Strict-1.0.0
# See LICENSE in the project root for the full terms.
#
# Licensing inquiries: license@zombietech.biz
# =============================================================================

import uuid
from datetime import datetime

from pydantic import BaseModel


class OtherPartyOut(BaseModel):
    id: uuid.UUID
    display_name: str
    avatar_url: str | None

    model_config = {"from_attributes": True}


class MessageOut(BaseModel):
    id: uuid.UUID
    conversation_id: uuid.UUID
    sender_id: uuid.UUID
    body: str
    read_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class ConversationOut(BaseModel):
    id: uuid.UUID
    customer_id: uuid.UUID
    provider_id: uuid.UUID
    other_party: OtherPartyOut
    last_message: MessageOut | None
    unread_count: int
    created_at: datetime

    model_config = {"from_attributes": True}


class MessagesListOut(BaseModel):
    items: list[MessageOut]
    has_next: bool


class StartConversationRequest(BaseModel):
    provider_id: uuid.UUID


class SendMessageRequest(BaseModel):
    body: str
