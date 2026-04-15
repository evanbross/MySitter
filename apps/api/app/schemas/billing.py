import uuid
from datetime import datetime

from pydantic import BaseModel


class SubscribeRequest(BaseModel):
    tier: str  # "BASIC" | "PRO" | "PREMIUM"


class SubscribeResponse(BaseModel):
    client_secret: str


class SubscriptionResponse(BaseModel):
    id: uuid.UUID
    provider_id: uuid.UUID
    stripe_subscription_id: str
    tier: str
    status: str
    current_period_end: datetime

    model_config = {"from_attributes": True}
