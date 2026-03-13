from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from middleware.auth_middleware import get_current_user
from models.order import Order
from models.user import User
from schemas.order import (
    GroupOrderJoinRequest,
    GroupOrderJoinRequestCreate,
    GroupOrderJoinRequestDecision,
    GroupOrderJoinRequestResponse,
    GroupOrderResponse,
    OrderCreateRequest,
    OrderItemSchema,
    OrderResponse,
)
from services.order_service import (
    accept_order,
    accept_group_order,
    approve_group_join_request,
    cancel_group_join_request,
    cancel_order,
    close_group_order,
    count_group_participants,
    create_group_join_request,
    create_order,
    deliver_group_order,
    deliver_order,
    get_deliverer_orders,
    get_deliverer_queue,
    get_group_participants,
    get_hall_open_group_orders,
    get_user_orders,
    join_group_order,
    list_group_join_requests,
    pickup_group_order,
    pickup_order,
    reject_group_join_request,
)


router = APIRouter(prefix="/orders", tags=["orders"])


def _order_to_response(
    order: Order, orderer: User, deliverer: User | None
) -> OrderResponse:
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
        group_order_id=order.group_order_id,
        is_group_open=order.is_group_open,
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
    order.is_group_open = body.is_group_open
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


@router.get("/my-deliveries", response_model=list[OrderResponse])
async def get_my_deliveries(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get orders where current user is the deliverer (accepted/picked_up)."""
    orders = await get_deliverer_orders(db, str(user.id))
    responses = []
    for order in orders:
        responses.append(await _get_order_response(db, order))
    return responses


@router.get("/group/hall-open", response_model=list[OrderResponse])
async def get_open_group_orders(
    hall: str | None = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get open group orders, optionally filtered by hall."""
    # HALL RESTRICTION: Users can only see group orders from their own hall
    if not user.dorm_hall:
        return []  # No hall set -> no group orders visible

    orders = await get_hall_open_group_orders(db, user.dorm_hall)
    responses = []
    for order in orders:
        resp = await _get_order_response(db, order)
        resp.participant_count = await count_group_participants(db, order.id)
        responses.append(resp)
    return responses


@router.get("/group/{root_order_id}", response_model=GroupOrderResponse)
async def get_group_order_detail(
    root_order_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get group order details with all participants."""
    from sqlalchemy import select as sa_select

    result = await db.execute(sa_select(Order).where(Order.id == root_order_id))
    root = result.scalar_one_or_none()
    if not root:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group order not found",
        )

    # HALL RESTRICTION: Only allow access if user has hall AND (is owner/participant/deliverer OR same hall)
    if not user.dorm_hall:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must set your dorm hall to view group orders",
        )

    is_owner = root.orderer_id == user.id
    is_deliverer = root.deliverer_id == user.id

    # Check if user is a participant
    participant_check = await db.execute(
        sa_select(Order).where(
            (Order.group_order_id == root_order_id) & (Order.orderer_id == user.id)
        )
    )
    is_participant = participant_check.scalar_one_or_none() is not None

    same_hall = root.delivery_hall == user.dorm_hall

    if not (is_owner or is_participant or is_deliverer or same_hall):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view group orders from your own hall",
        )

    root_resp = await _get_order_response(db, root)
    participants = await get_group_participants(db, root_order_id)
    part_responses = []
    for participant in participants:
        part_responses.append(await _get_order_response(db, participant))

    root_resp.participant_count = len(participants)

    my_request_result = await db.execute(
        sa_select(GroupOrderJoinRequest).where(
            (GroupOrderJoinRequest.root_order_id == root_order_id)
            & (GroupOrderJoinRequest.requester_id == user.id)
        )
    )
    my_request = my_request_result.scalar_one_or_none()
    my_join_request_resp = None
    if my_request:
        requester_result = await db.execute(
            sa_select(User).where(User.id == my_request.requester_id)
        )
        req_user = requester_result.scalar_one()
        my_join_request_resp = GroupOrderJoinRequestResponse(
            id=str(my_request.id),
            root_order_id=str(my_request.root_order_id),
            requester_id=str(my_request.requester_id),
            requester_nickname=req_user.nickname or "Unknown",
            status=my_request.status,
            note=my_request.note,
            created_at=my_request.created_at,
            decided_at=my_request.decided_at,
            decided_by_user_id=str(my_request.decided_by_user_id)
            if my_request.decided_by_user_id
            else None,
            decision_reason=my_request.decision_reason,
        )

    pending_count = 0
    if is_deliverer:
        pending_count_result = await db.execute(
            sa_select(GroupOrderJoinRequest).where(
                (GroupOrderJoinRequest.root_order_id == root_order_id)
                & (GroupOrderJoinRequest.status == "pending")
            )
        )
        pending_count = len(pending_count_result.scalars().all())

    return GroupOrderResponse(
        root_order=root_resp,
        participants=part_responses,
        total_participants=len(participants) + 1,
        is_open=root.is_group_open,
        my_join_request=my_join_request_resp,
        pending_join_requests_count=pending_count,
    )


@router.post(
    "/group/{root_order_id}/join",
    response_model=OrderResponse,
    status_code=status.HTTP_201_CREATED,
)
async def join_group(
    root_order_id: str,
    body: GroupOrderJoinRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Join a group order."""
    joiner = await join_group_order(db, root_order_id, user, body.note)
    await db.commit()
    await db.refresh(joiner)
    return await _get_order_response(db, joiner)


@router.patch("/group/{root_order_id}/close", response_model=OrderResponse)
async def close_group(
    root_order_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Close a group order to new joiners."""
    order = await close_group_order(db, root_order_id, str(user.id))
    await db.commit()
    await db.refresh(order)
    return await _get_order_response(db, order)


@router.post(
    "/group/{root_order_id}/join-requests",
    response_model=GroupOrderJoinRequestResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_join_request(
    root_order_id: str,
    body: GroupOrderJoinRequestCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Submit a join request for a group order (requires deliverer approval)."""
    join_request = await create_group_join_request(db, root_order_id, user, body.note)
    await db.commit()
    await db.refresh(join_request)
    return GroupOrderJoinRequestResponse(
        id=str(join_request.id),
        root_order_id=str(join_request.root_order_id),
        requester_id=str(join_request.requester_id),
        requester_nickname=user.nickname or "Unknown",
        status=join_request.status,
        note=join_request.note,
        created_at=join_request.created_at,
        decided_at=join_request.decided_at,
        decided_by_user_id=str(join_request.decided_by_user_id)
        if join_request.decided_by_user_id
        else None,
        decision_reason=join_request.decision_reason,
    )


@router.get(
    "/group/{root_order_id}/join-requests",
    response_model=list[GroupOrderJoinRequestResponse],
)
async def get_join_requests(
    root_order_id: str,
    status_filter: str = "pending",
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List join requests for a group order (deliverer only)."""
    requests = await list_group_join_requests(db, root_order_id, user, status_filter)
    responses = []
    for req in requests:
        requester_result = await db.execute(
            select(User).where(User.id == req.requester_id)
        )
        req_user = requester_result.scalar_one()
        responses.append(
            GroupOrderJoinRequestResponse(
                id=str(req.id),
                root_order_id=str(req.root_order_id),
                requester_id=str(req.requester_id),
                requester_nickname=req_user.nickname or "Unknown",
                status=req.status,
                note=req.note,
                created_at=req.created_at,
                decided_at=req.decided_at,
                decided_by_user_id=str(req.decided_by_user_id)
                if req.decided_by_user_id
                else None,
                decision_reason=req.decision_reason,
            )
        )
    return responses


@router.patch(
    "/group/join-requests/{join_request_id}/approve",
    response_model=GroupOrderJoinRequestResponse,
)
async def approve_join_request(
    join_request_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Approve a pending join request (deliverer only)."""
    join_request = await approve_group_join_request(db, join_request_id, user)
    await db.commit()
    await db.refresh(join_request)
    requester_result = await db.execute(
        select(User).where(User.id == join_request.requester_id)
    )
    req_user = requester_result.scalar_one()
    return GroupOrderJoinRequestResponse(
        id=str(join_request.id),
        root_order_id=str(join_request.root_order_id),
        requester_id=str(join_request.requester_id),
        requester_nickname=req_user.nickname or "Unknown",
        status=join_request.status,
        note=join_request.note,
        created_at=join_request.created_at,
        decided_at=join_request.decided_at,
        decided_by_user_id=str(join_request.decided_by_user_id)
        if join_request.decided_by_user_id
        else None,
        decision_reason=join_request.decision_reason,
    )


@router.patch(
    "/group/join-requests/{join_request_id}/reject",
    response_model=GroupOrderJoinRequestResponse,
)
async def reject_join_request(
    join_request_id: str,
    body: GroupOrderJoinRequestDecision,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Reject a pending join request (deliverer only)."""
    join_request = await reject_group_join_request(
        db, join_request_id, user, body.reason
    )
    await db.commit()
    await db.refresh(join_request)
    requester_result = await db.execute(
        select(User).where(User.id == join_request.requester_id)
    )
    req_user = requester_result.scalar_one()
    return GroupOrderJoinRequestResponse(
        id=str(join_request.id),
        root_order_id=str(join_request.root_order_id),
        requester_id=str(join_request.requester_id),
        requester_nickname=req_user.nickname or "Unknown",
        status=join_request.status,
        note=join_request.note,
        created_at=join_request.created_at,
        decided_at=join_request.decided_at,
        decided_by_user_id=str(join_request.decided_by_user_id)
        if join_request.decided_by_user_id
        else None,
        decision_reason=join_request.decision_reason,
    )


@router.patch(
    "/group/join-requests/{join_request_id}/cancel",
    response_model=GroupOrderJoinRequestResponse,
)
async def cancel_join_request(
    join_request_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Cancel own pending join request (requester only)."""
    join_request = await cancel_group_join_request(db, join_request_id, user)
    await db.commit()
    await db.refresh(join_request)
    return GroupOrderJoinRequestResponse(
        id=str(join_request.id),
        root_order_id=str(join_request.root_order_id),
        requester_id=str(join_request.requester_id),
        requester_nickname=user.nickname or "Unknown",
        status=join_request.status,
        note=join_request.note,
        created_at=join_request.created_at,
        decided_at=join_request.decided_at,
        decided_by_user_id=str(join_request.decided_by_user_id)
        if join_request.decided_by_user_id
        else None,
        decision_reason=join_request.decision_reason,
    )


@router.patch("/group/{root_order_id}/accept", response_model=list[OrderResponse])
async def accept_group(
    root_order_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Accept all orders in a group for delivery."""
    from sqlalchemy import select as sa_select

    # HALL RESTRICTION: Can only accept group orders from your own hall
    result = await db.execute(sa_select(Order).where(Order.id == root_order_id))
    root_order = result.scalar_one_or_none()
    if not root_order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group order not found",
        )

    if not user.dorm_hall:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must set your dorm hall to accept group orders",
        )
    if root_order.delivery_hall != user.dorm_hall:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only accept group orders from your own hall",
        )

    orders = await accept_group_order(db, root_order_id, user)
    await db.commit()
    responses = []
    for order in orders:
        await db.refresh(order)
        responses.append(await _get_order_response(db, order))
    return responses


@router.patch("/group/{root_order_id}/pickup", response_model=list[OrderResponse])
async def pickup_group(
    root_order_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark all group orders as picked up."""
    orders = await pickup_group_order(db, root_order_id, str(user.id))
    await db.commit()
    responses = []
    for order in orders:
        await db.refresh(order)
        responses.append(await _get_order_response(db, order))
    return responses


@router.patch("/group/{root_order_id}/deliver", response_model=list[OrderResponse])
async def deliver_group(
    root_order_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark all group orders as delivered and award credits."""
    orders = await deliver_group_order(db, root_order_id, str(user.id))
    await db.commit()
    responses = []
    for order in orders:
        await db.refresh(order)
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
    # Allow any authenticated user to view pending orders (for browsing)

    # Non-pending orders require orderer/deliverer role

    is_orderer = order.orderer_id == str(user.id)

    is_deliverer = order.deliverer_id is not None and order.deliverer_id == str(user.id)

    if not is_orderer and not is_deliverer and order.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view your own orders",
        )

    # Get the full order response

    response = await _get_order_response(db, order)

    # Redact QR fields for non-orderer viewers of pending orders

    if not is_orderer and not is_deliverer:
        response.qr_code_image = None

        response.qr_code_data = None

    return response


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
