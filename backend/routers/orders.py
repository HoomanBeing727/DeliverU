from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from middleware.auth_middleware import get_current_user
from models.order import Order
from models.user import User
from schemas.order import OrderCreateRequest, OrderResponse, OrderItemSchema
from services.order_service import (
    create_order,
    get_user_orders,
    get_deliverer_queue,
    accept_order,
    pickup_order,
    deliver_order,
    cancel_order,
)


router = APIRouter(prefix="/orders", tags=["orders"])


def _order_to_response(order: Order, orderer: User, deliverer: User | None) -> OrderResponse:
    """Convert an Order ORM instance to an OrderResponse."""
    return OrderResponse(
        id=str(order.id),
        orderer_id=str(order.orderer_id),
        deliverer_id=str(order.deliverer_id) if order.deliverer_id else None,
        status=order.status,
        canteen=order.canteen,
        items=[OrderItemSchema(**item) for item in order.items],
        total_price=order.total_price,
        delivery_hall=order.delivery_hall,
        delivery_preference=order.delivery_preference,
        qr_code_image=order.qr_code_image,
        qr_code_data=order.qr_code_data,
        note=order.note,
        orderer_nickname=orderer.nickname or "Unknown",
        deliverer_nickname=deliverer.nickname if deliverer else None,
        created_at=order.created_at,
        accepted_at=order.accepted_at,
        picked_up_at=order.picked_up_at,
        delivered_at=order.delivered_at,
        cancelled_at=order.cancelled_at,
    )


async def _get_order_response(db: AsyncSession, order: Order) -> OrderResponse:
    """Fetch orderer/deliverer users and build OrderResponse."""
    result = await db.execute(select(User).where(User.id == order.orderer_id))
    orderer = result.scalar_one()

    deliverer = None
    if order.deliverer_id:
        result = await db.execute(select(User).where(User.id == order.deliverer_id))
        deliverer = result.scalar_one_or_none()

    return _order_to_response(order, orderer, deliverer)


@router.post("", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
async def create_new_order(
    body: OrderCreateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new food delivery order."""
    items_dicts = [item.model_dump() for item in body.items]
    order = await create_order(
        db=db,
        user=user,
        canteen=body.canteen,
        items=items_dicts,
        total_price=body.total_price,
        delivery_hall=body.delivery_hall,
        note=body.note,
        qr_code_image=body.qr_code_image,
        qr_code_data=body.qr_code_data,
    )
    await db.commit()
    await db.refresh(order)
    return await _get_order_response(db, order)


@router.get("/my", response_model=list[OrderResponse])
async def get_my_orders(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all orders placed by the authenticated user."""
    orders = await get_user_orders(db, str(user.id))
    responses = []
    for order in orders:
        responses.append(await _get_order_response(db, order))
    return responses


@router.get("/queue", response_model=list[OrderResponse])
async def get_order_queue(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get pending orders available for delivery, filtered by user's preferred halls."""
    orders = await get_deliverer_queue(db, user.preferred_delivery_halls)
    responses = []
    for order in orders:
        responses.append(await _get_order_response(db, order))
    return responses


@router.get("/{order_id}", response_model=OrderResponse)
async def get_order_detail(
    order_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get details of a specific order."""
    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found",
        )
    if order.orderer_id != str(user.id) and order.deliverer_id != str(user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view your own orders",
        )
    return await _get_order_response(db, order)


@router.patch("/{order_id}/accept", response_model=OrderResponse)
async def accept_delivery(
    order_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Accept an order for delivery."""
    order = await accept_order(db, order_id, user)
    await db.commit()
    await db.refresh(order)
    return await _get_order_response(db, order)


@router.patch("/{order_id}/pickup", response_model=OrderResponse)
async def mark_picked_up(
    order_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark an order as picked up from the canteen."""
    order = await pickup_order(db, order_id, str(user.id))
    await db.commit()
    await db.refresh(order)
    return await _get_order_response(db, order)


@router.patch("/{order_id}/deliver", response_model=OrderResponse)
async def mark_delivered(
    order_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark an order as delivered to the orderer."""
    order = await deliver_order(db, order_id, str(user.id))
    await db.commit()
    await db.refresh(order)
    return await _get_order_response(db, order)


@router.patch("/{order_id}/cancel", response_model=OrderResponse)
async def cancel_my_order(
    order_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Cancel an order (only by orderer, only if pending or accepted)."""
    order = await cancel_order(db, order_id, str(user.id))
    await db.commit()
    await db.refresh(order)
    return await _get_order_response(db, order)
