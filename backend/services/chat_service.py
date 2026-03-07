from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from models.message import ChatMessage
from models.order import Order


async def send_message(
    db: AsyncSession, order_id: str, sender_id: str, content: str
) -> ChatMessage:
    """Send a chat message for an order.
    
    Args:
        db: Database session
        order_id: Order ID
        sender_id: User ID of the sender
        content: Message content
        
    Returns:
        Created ChatMessage
        
    Raises:
        HTTPException: If order not found, not in valid status, or user not a participant
    """
    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found",
        )
    
    if order.status not in ("accepted", "picked_up"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Chat is only available for accepted or picked up orders",
        )
    
    if order.orderer_id != sender_id and order.deliverer_id != sender_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a participant in this order",
        )
    
    message = ChatMessage(
        order_id=order_id,
        sender_id=sender_id,
        content=content,
        message_type="text",
    )
    db.add(message)
    await db.commit()
    await db.refresh(message)
    return message


async def get_messages(
    db: AsyncSession, order_id: str, user_id: str, since: datetime | None = None
) -> list[ChatMessage]:
    """Get chat messages for an order.
    
    Args:
        db: Database session
        order_id: Order ID
        user_id: User ID requesting messages
        since: Optional datetime to get only messages after this timestamp (for polling)
        
    Returns:
        List of ChatMessage ordered by created_at ascending
        
    Raises:
        HTTPException: If order not found or user not a participant
    """
    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found",
        )
    
    if order.orderer_id != user_id and order.deliverer_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a participant in this order",
        )
    
    query = select(ChatMessage).where(ChatMessage.order_id == order_id)
    if since:
        query = query.where(ChatMessage.created_at > since)
    query = query.order_by(ChatMessage.created_at.asc())
    
    result = await db.execute(query)
    return list(result.scalars().all())


async def create_system_message(
    db: AsyncSession, order_id: str, content: str
) -> ChatMessage:
    """Create a system-generated message for an order.
    
    Args:
        db: Database session
        order_id: Order ID
        content: System message content
        
    Returns:
        Created ChatMessage with message_type="system"
        
    Raises:
        HTTPException: If order not found
    """
    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found",
        )
    
    message = ChatMessage(
        order_id=order_id,
        sender_id=order.orderer_id,
        content=content,
        message_type="system",
    )
    db.add(message)
    await db.commit()
    await db.refresh(message)
    return message


async def delete_chat(db: AsyncSession, order_id: str) -> None:
    """Delete all chat messages for an order.
    
    Args:
        db: Database session
        order_id: Order ID
    """
    await db.execute(delete(ChatMessage).where(ChatMessage.order_id == order_id))
    await db.commit()
