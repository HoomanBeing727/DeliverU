from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.order import Order  # pyright: ignore[reportImplicitRelativeImport]
from models.group_order_join_request import GroupOrderJoinRequest  # pyright: ignore[reportImplicitRelativeImport]
from models.user import User  # pyright: ignore[reportImplicitRelativeImport]
from services.credit_service import add_credit, deduct_credit  # pyright: ignore[reportImplicitRelativeImport]
from services.chat_service import create_system_message, delete_chat  # pyright: ignore[reportImplicitRelativeImport]


def _format_delivery_habit(habit: str | None) -> str:
    """Map delivery habit values to human-readable display names."""
    if not habit:
        return "Hand to Hand"
    habit_map = {
        "hand_to_hand": "Hand to Hand",
        "floor": "Leave at Floor",
        "door_handle": "Hang on Door Handle",
    }
    return habit_map.get(habit, habit)


async def create_order(
    db: AsyncSession,
    user: User,
    canteen: str,
    items: list[dict[str, object]],
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


async def get_deliverer_orders(db: AsyncSession, user_id: str) -> list[Order]:
    """Get orders where user is the deliverer with active status (accepted/picked_up)."""
    result = await db.execute(
        select(Order)
        .where(Order.deliverer_id == user_id)
        .where(Order.status.in_(["accepted", "picked_up"]))
        .order_by(Order.created_at.asc())
    )
    return list(result.scalars().all())


async def get_deliverer_queue(
    db: AsyncSession, preferred_halls: list[str] | None = None
) -> list[Order]:
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
    _ = await create_system_message(
        db, order_id, "Order accepted! Chat is now available."
    )

    # Fetch orderer to get their preferences
    orderer_result = await db.execute(select(User).where(User.id == order.orderer_id))
    orderer = orderer_result.scalar_one()

    # Send delivery preferences info message
    orderer_habit = _format_delivery_habit(orderer.pref_delivery_habit)
    deliverer_habit = _format_delivery_habit(user.pref_delivery_habit)
    pref_message = f"""📋 Delivery Preferences:
• Orderer prefers: {orderer_habit}
• Delivery to: {order.delivery_hall}
• Deliverer prefers: {deliverer_habit}"""
    _ = await create_system_message(db, order_id, pref_message)

    # Detect hall access conflict
    if (
        order.delivery_preference != "hand_to_hand"
        and user.dorm_hall != order.delivery_hall
    ):
        conflict_message = f"⚠️ Hall access conflict detected: Deliverer is from {user.dorm_hall} but order is for {order.delivery_hall}. Delivery method changed to Hand to Hand (meet at hall lobby)."
        _ = await create_system_message(db, order_id, conflict_message)

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


async def get_hall_open_group_orders(
    db: AsyncSession, hall: str | None = None
) -> list[Order]:
    """Get open group orders, optionally filtered by hall."""
    query = select(Order).where(
        (Order.is_group_open == True)
        & (Order.status == "pending")
        & (Order.group_order_id == None)
    )
    if hall:
        query = query.where(Order.delivery_hall == hall)
    query = query.order_by(Order.created_at.desc())
    result = await db.execute(query)
    return list(result.scalars().all())


async def get_group_participants(db: AsyncSession, root_order_id: str) -> list[Order]:
    """Get all participant orders for a group order."""
    result = await db.execute(
        select(Order)
        .where(Order.group_order_id == root_order_id)
        .order_by(Order.created_at.asc())
    )
    return list(result.scalars().all())


async def count_group_participants(db: AsyncSession, order_id: str) -> int:
    """Count the number of participants in a group order."""
    from sqlalchemy import func

    result = await db.execute(
        select(func.count()).select_from(Order).where(Order.group_order_id == order_id)
    )
    return result.scalar() or 0


async def join_group_order(
    db: AsyncSession,
    root_order_id: str,
    user: User,
    note: str | None = None,
) -> Order:
    """Join an existing group order by creating a linked order."""
    result = await db.execute(select(Order).where(Order.id == root_order_id))
    root_order = result.scalar_one_or_none()
    if not root_order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group order not found",
        )

    # HALL RESTRICTION: Can only join group orders from your own hall
    if not user.dorm_hall:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must set your dorm hall to join group orders",
        )
    if root_order.delivery_hall != user.dorm_hall:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only join group orders from your own hall",
        )

    if not root_order.is_group_open:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This group order is no longer open",
        )
    if root_order.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only join pending group orders",
        )
    if root_order.orderer_id == user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot join your own group order",
        )

    existing = await db.execute(
        select(Order).where(
            (Order.group_order_id == root_order_id)
            & (Order.orderer_id == user.id)
            & (Order.status != "cancelled")
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You already joined this group order",
        )

    if user.credits < 1:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Insufficient credits",
        )

    joiner = Order(
        orderer_id=user.id,
        canteen=root_order.canteen,
        items=[],
        total_price=0,
        delivery_hall=root_order.delivery_hall,
        delivery_preference=user.pref_delivery_habit or "hand_to_hand",
        note=note,
        group_order_id=root_order_id,
        is_group_open=False,
    )
    db.add(joiner)
    await db.flush()

    await deduct_credit(db, user, 1, "group_order_joined", order_id=joiner.id)
    return joiner


async def create_group_join_request(
    db: AsyncSession,
    root_order_id: str,
    requester: User,
    note: str | None = None,
) -> GroupOrderJoinRequest:
    result = await db.execute(select(Order).where(Order.id == root_order_id))
    root_order = result.scalar_one_or_none()
    if not root_order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group order not found",
        )

    if root_order.group_order_id is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Order is not a root group order",
        )

    if not requester.dorm_hall:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must set your dorm hall to join group orders",
        )
    if requester.dorm_hall != root_order.delivery_hall:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                f"You can only join group orders for your hall ({requester.dorm_hall}). "
                f"This order is for {root_order.delivery_hall}."
            ),
        )

    if requester.id == root_order.orderer_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You cannot request to join your own group order",
        )

    if root_order.status in ("picked_up", "delivered", "cancelled"):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot request to join a completed or cancelled group order",
        )
    if root_order.status != "accepted":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Group order must be accepted before requesting to join",
        )
    if not root_order.is_group_open:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This group order is no longer open",
        )
    if not root_order.deliverer_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Group order has no deliverer assigned",
        )
    if requester.id == root_order.deliverer_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Deliverer cannot request to join their own group order",
        )

    existing_result = await db.execute(
        select(GroupOrderJoinRequest).where(
            (GroupOrderJoinRequest.root_order_id == root_order.id)
            & (GroupOrderJoinRequest.requester_id == requester.id)
        )
    )
    existing = existing_result.scalar_one_or_none()
    if existing:
        if existing.status == "pending":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="You already have a pending join request for this group order",
            )
        if existing.status == "approved":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Your join request has already been approved",
            )
        if existing.status == "rejected" and root_order.status == "accepted":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Your previous join request was rejected",
            )
        if existing.status == "cancelled":
            existing.status = "pending"
            existing.note = note
            existing.decided_at = None
            existing.decided_by_user_id = None
            existing.child_order_id = None
            existing.decision_reason = None
            await db.flush()
            return existing

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot create a new join request for this group order",
        )

    join_request = GroupOrderJoinRequest(
        root_order_id=root_order.id,
        requester_id=requester.id,
        status="pending",
        note=note,
    )
    db.add(join_request)
    await db.flush()
    return join_request


async def list_group_join_requests(
    db: AsyncSession,
    root_order_id: str,
    deliverer: User,
    status_filter: str = "pending",
) -> list[GroupOrderJoinRequest]:
    result = await db.execute(select(Order).where(Order.id == root_order_id))
    root_order = result.scalar_one_or_none()
    if not root_order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group order not found",
        )

    if deliverer.id != root_order.deliverer_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the assigned deliverer can view join requests",
        )

    stmt = select(GroupOrderJoinRequest).where(
        (GroupOrderJoinRequest.root_order_id == root_order.id)
        & (GroupOrderJoinRequest.status == status_filter)
    )
    stmt = stmt.order_by(GroupOrderJoinRequest.created_at.asc())

    join_requests_result = await db.execute(stmt)
    return list(join_requests_result.scalars().all())


async def approve_group_join_request(
    db: AsyncSession,
    join_request_id: str,
    deliverer: User,
) -> GroupOrderJoinRequest:
    join_request_result = await db.execute(
        select(GroupOrderJoinRequest).where(GroupOrderJoinRequest.id == join_request_id)
    )
    join_request = join_request_result.scalar_one_or_none()
    if not join_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Join request not found",
        )

    if join_request.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Join request is not pending",
        )

    root_result = await db.execute(
        select(Order).where(Order.id == join_request.root_order_id)
    )
    root_order = root_result.scalar_one_or_none()
    if not root_order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group order not found",
        )

    requester_result = await db.execute(
        select(User).where(User.id == join_request.requester_id)
    )
    requester = requester_result.scalar_one_or_none()
    if not requester:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Requester not found",
        )

    if root_order.status != "accepted":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Group order is not in accepted status",
        )
    if not root_order.is_group_open:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This group order is no longer open",
        )
    if deliverer.id != root_order.deliverer_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the assigned deliverer can approve join requests",
        )
    if deliverer.id == requester.id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You cannot approve your own join request",
        )

    if requester.credits < 1:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Insufficient credits",
        )

    now = datetime.now(timezone.utc)
    child_order = Order(
        orderer_id=requester.id,
        canteen=root_order.canteen,
        delivery_hall=root_order.delivery_hall,
        delivery_preference=requester.pref_delivery_habit or "hand_to_hand",
        group_order_id=root_order.id,
        status="accepted",
        deliverer_id=root_order.deliverer_id,
        accepted_at=now,
        note=join_request.note,
        items=[],
        total_price=0.0,
        qr_code_image=None,
        qr_code_data=None,
    )
    db.add(child_order)
    await db.flush()

    await deduct_credit(
        db,
        requester,
        1,
        "group_order_join_approved",
        order_id=child_order.id,
    )

    join_request.status = "approved"
    join_request.decided_at = now
    join_request.decided_by_user_id = deliverer.id
    join_request.child_order_id = child_order.id
    await db.flush()
    return join_request


async def reject_group_join_request(
    db: AsyncSession,
    join_request_id: str,
    deliverer: User,
    reason: str | None = None,
) -> GroupOrderJoinRequest:
    join_request_result = await db.execute(
        select(GroupOrderJoinRequest).where(GroupOrderJoinRequest.id == join_request_id)
    )
    join_request = join_request_result.scalar_one_or_none()
    if not join_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Join request not found",
        )

    if join_request.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Join request is not pending",
        )

    root_result = await db.execute(
        select(Order).where(Order.id == join_request.root_order_id)
    )
    root_order = root_result.scalar_one_or_none()
    if not root_order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group order not found",
        )

    if deliverer.id != root_order.deliverer_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the assigned deliverer can reject join requests",
        )

    join_request.status = "rejected"
    join_request.decided_at = datetime.now(timezone.utc)
    join_request.decided_by_user_id = deliverer.id
    join_request.decision_reason = reason or "rejected_by_deliverer"
    await db.flush()
    return join_request


async def cancel_group_join_request(
    db: AsyncSession,
    join_request_id: str,
    requester: User,
) -> GroupOrderJoinRequest:
    join_request_result = await db.execute(
        select(GroupOrderJoinRequest).where(GroupOrderJoinRequest.id == join_request_id)
    )
    join_request = join_request_result.scalar_one_or_none()
    if not join_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Join request not found",
        )

    if join_request.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Join request is not pending",
        )

    if requester.id != join_request.requester_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only cancel your own join request",
        )

    join_request.status = "cancelled"
    await db.flush()
    return join_request


async def close_group_order(
    db: AsyncSession, root_order_id: str, user_id: str
) -> Order:
    """Close a group order to prevent new joiners."""
    result = await db.execute(select(Order).where(Order.id == root_order_id))
    root_order = result.scalar_one_or_none()
    if not root_order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found",
        )
    if root_order.orderer_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the group creator can close it",
        )
    if not root_order.is_group_open:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Group order is already closed",
        )

    root_order.is_group_open = False

    pending_requests_stmt = select(GroupOrderJoinRequest).where(
        (GroupOrderJoinRequest.root_order_id == root_order.id)
        & (GroupOrderJoinRequest.status == "pending")
    )
    pending_requests_result = await db.execute(pending_requests_stmt)
    pending_requests = pending_requests_result.scalars().all()
    for req in pending_requests:
        req.status = "rejected"
        req.decided_at = datetime.now(timezone.utc)
        req.decision_reason = "closed"

    return root_order


async def accept_group_order(
    db: AsyncSession, root_order_id: str, user: User
) -> list[Order]:
    """Accept all orders in a group as a deliverer."""
    result = await db.execute(select(Order).where(Order.id == root_order_id))
    root_order = result.scalar_one_or_none()
    if not root_order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group order not found",
        )
    if root_order.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Group order is not pending",
        )
    if root_order.orderer_id == user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot deliver your own order",
        )

    participants = await get_group_participants(db, root_order_id)
    all_orders = [root_order] + participants

    now = datetime.now(timezone.utc)
    for order in all_orders:
        if order.status == "pending":
            order.status = "accepted"
            order.deliverer_id = user.id
            order.accepted_at = now

    return all_orders


async def pickup_group_order(
    db: AsyncSession, root_order_id: str, user_id: str
) -> list[Order]:
    """Mark all orders in a group as picked up."""
    result = await db.execute(select(Order).where(Order.id == root_order_id))
    root_order = result.scalar_one_or_none()
    if not root_order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group order not found",
        )
    if root_order.deliverer_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the assigned deliverer can pick up",
        )

    participants = await get_group_participants(db, root_order_id)
    all_orders = [root_order] + participants

    now = datetime.now(timezone.utc)
    for order in all_orders:
        if order.status == "accepted":
            order.status = "picked_up"
            order.picked_up_at = now

    root_order.is_group_open = False

    pending_requests_stmt = select(GroupOrderJoinRequest).where(
        (GroupOrderJoinRequest.root_order_id == root_order.id)
        & (GroupOrderJoinRequest.status == "pending")
    )
    pending_requests_result = await db.execute(pending_requests_stmt)
    pending_requests = pending_requests_result.scalars().all()
    for req in pending_requests:
        req.status = "rejected"
        req.decided_at = datetime.now(timezone.utc)
        req.decision_reason = "picked_up"

    return all_orders


async def deliver_group_order(
    db: AsyncSession, root_order_id: str, user_id: str
) -> list[Order]:
    """Mark all orders in a group as delivered. Awards credits per participant."""
    result = await db.execute(select(Order).where(Order.id == root_order_id))
    root_order = result.scalar_one_or_none()
    if not root_order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group order not found",
        )
    if root_order.deliverer_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the assigned deliverer can deliver",
        )

    participants = await get_group_participants(db, root_order_id)
    all_orders = [root_order] + participants

    now = datetime.now(timezone.utc)
    deliverer_result = await db.execute(select(User).where(User.id == user_id))
    deliverer = deliverer_result.scalar_one()

    for order in all_orders:
        if order.status == "picked_up":
            order.status = "delivered"
            order.delivered_at = now
            await add_credit(
                db, deliverer, 1, "group_delivery_completed", order_id=order.id
            )

    return all_orders
