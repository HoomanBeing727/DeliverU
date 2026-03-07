from datetime import datetime

from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from middleware.auth_middleware import get_current_user
from models.user import User
from schemas.chat import ChatMessageResponse, SendMessageRequest
from services.chat_service import get_messages, send_message


router = APIRouter(prefix="/orders", tags=["chat"])


@router.post("/{order_id}/chat", response_model=ChatMessageResponse, status_code=status.HTTP_201_CREATED)
async def send_chat_message(
    order_id: str,
    request: SendMessageRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Send a chat message for an order."""
    message = await send_message(db, order_id, str(user.id), request.content)
    
    # Populate sender_nickname
    result = await db.execute(select(User).where(User.id == message.sender_id))
    sender = result.scalar_one_or_none()
    sender_nickname = sender.nickname if sender else "Unknown"
    
    return ChatMessageResponse(
        id=message.id,
        order_id=message.order_id,
        sender_id=message.sender_id,
        sender_nickname=sender_nickname,
        content=message.content,
        message_type=message.message_type,
        created_at=message.created_at,
    )


@router.get("/{order_id}/chat", response_model=list[ChatMessageResponse])
async def get_chat_messages(
    order_id: str,
    since: str | None = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get chat messages for an order. Optionally filter by 'since' timestamp for polling."""
    since_dt = None
    if since:
        since_dt = datetime.fromisoformat(since)
    
    messages = await get_messages(db, order_id, str(user.id), since_dt)
    
    # Populate sender_nickname for each message
    responses = []
    for message in messages:
        result = await db.execute(select(User).where(User.id == message.sender_id))
        sender = result.scalar_one_or_none()
        sender_nickname = sender.nickname if sender else "Unknown"
        
        responses.append(
            ChatMessageResponse(
                id=message.id,
                order_id=message.order_id,
                sender_id=message.sender_id,
                sender_nickname=sender_nickname,
                content=message.content,
                message_type=message.message_type,
                created_at=message.created_at,
            )
        )
    
    return responses
