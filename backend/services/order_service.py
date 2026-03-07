from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.order import Order
from models.user import User
from models.credit_transaction import CreditTransaction
from services.credit_service import add_credit, deduct_credit
from services.chat_service import create_system_message, delete_chat


async def create_order(
    db: AsyncSession,
    user: User,
    canteen: str,
    items: list[dict],
    total_price: float,
    delivery_hall: str,
    note: str | None = None,
    qr_code_image: str | None = None,
    qr_code_data: str | None = None,
) -> Order:
    """Create a new order, deducting 1 credit from the orderer."""
    # Check for existing active orders
    active_order_result = await db.execute(
        select(Order).where(
            (Order.orderer_id == user.id)
            & (Order.status.in_(["pending", "accepted", "picked_up"]))
        )
    )
    if active_order_result.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You already have an active order. Please wait for it to complete before placing a new one.",
        )

    if user.credits < 1:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Insufficient credits to place an order",
        )

    order = Order(
        orderer_id=user.id,
        canteen=canteen,
        items=items,
        total_price=total_price,
        delivery_hall=delivery_hall,
        delivery_preference=user.pref_delivery_habit or "hand_to_hand",
        note=note,
        qr_code_image=qr_code_image,
        qr_code_data=qr_code_data,
    )
    db.add(order)
    await db.flush()

    await deduct_credit(db, user, 1, "order_placed", order_id=order.id)

    return order


async def get_user_orders(db: AsyncSession, user_id: str) -> list[Order]:
    """Get all orders placed by a user, ordered by most recent first."""
    result = await db.execute(
        select(Order)
        .where(Order.orderer_id == user_id)
        .order_by(Order.created_at.desc())
    )
    return list(result.scalars().all())


async def get_deliverer_queue(db: AsyncSession, preferred_halls: list[str] | None = None) -> list[Order]:
    """Get pending orders filtered by deliverer's preferred halls."""
    query = select(Order).where(Order.status == "pending")
    if preferred_halls:
        query = query.where(Order.delivery_hall.in_(preferred_halls))
    query = query.order_by(Order.created_at.asc())
    result = await db.execute(query)
    return list(result.scalars().all())


async def accept_order(db: AsyncSession, order_id: str, user: User) -> Order:
    """Accept an order as a deliverer."""
    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found",
        )
    if order.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Order is not in pending status",
        )
    if order.orderer_id == user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot deliver your own order",
        )

    order.status = "accepted"
    order.deliverer_id = user.id
    order.accepted_at = datetime.now(timezone.utc)
    await create_system_message(db, order_id, "Order accepted! Chat is now available.")
    return order


async def pickup_order(db: AsyncSession, order_id: str, user_id: str) -> Order:
    """Mark an order as picked up by the deliverer."""
    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found",
        )
    if order.deliverer_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the assigned deliverer can pick up this order",
        )
    if order.status != "accepted":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Order must be in accepted status to pick up",
        )

    order.status = "picked_up"
    order.picked_up_at = datetime.now(timezone.utc)
    return order


async def deliver_order(db: AsyncSession, order_id: str, user_id: str) -> Order:
    """Mark an order as delivered. Awards +1 credit to the deliverer."""
    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found",
        )
    if order.deliverer_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the assigned deliverer can complete this delivery",
        )
    if order.status != "picked_up":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Order must be in picked_up status to deliver",
        )

    order.status = "delivered"
    order.delivered_at = datetime.now(timezone.utc)
    await delete_chat(db, order_id)

    # Award +1 credit to deliverer
    deliverer_result = await db.execute(select(User).where(User.id == user_id))
    deliverer = deliverer_result.scalar_one()
    await add_credit(db, deliverer, 1, "delivery_completed", order_id=order.id)

    return order


async def cancel_order(db: AsyncSession, order_id: str, user_id: str) -> Order:
    """Cancel an order. Refunds 1 credit to the orderer if pending or accepted."""
    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found",
        )
    if order.orderer_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the orderer can cancel this order",
        )
    if order.status not in ("pending", "accepted"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Order can only be cancelled when pending or accepted",
        )

    order.status = "cancelled"
    order.cancelled_at = datetime.now(timezone.utc)
    await delete_chat(db, order_id)

    # Refund 1 credit to orderer
    orderer_result = await db.execute(select(User).where(User.id == user_id))
    orderer = orderer_result.scalar_one()
    await add_credit(db, orderer, 1, "order_cancelled_refund", order_id=order.id)

    return order
