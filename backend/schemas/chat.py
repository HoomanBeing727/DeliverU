from datetime import datetime

from pydantic import BaseModel


class SendMessageRequest(BaseModel):
    """Schema for sending a message in the chat."""

    content: str


class ChatMessageResponse(BaseModel):
    """Schema for returning chat message data."""

    id: str
    order_id: str
    sender_id: str
    sender_nickname: str
    content: str
    message_type: str
    created_at: datetime

    model_config = {"from_attributes": True}
