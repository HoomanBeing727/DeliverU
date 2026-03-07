from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from middleware.auth_middleware import get_current_user
from models.order import Order
from models.user import User
from schemas.rating import RateRequest, RatingResponse
from services.rating_service import submit_rating, get_order_ratings


router = APIRouter(prefix="/orders", tags=["ratings"])


@router.post("/{order_id}/rate", response_model=RatingResponse)
async def rate_order(
    order_id: str,
    body: RateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Submit a rating for an order. Only orderer or deliverer can rate."""
    rating = await submit_rating(
        db,
        order_id,
        user.id,
        body.stars,
        body.feedback,
    )
    await db.commit()
    await db.refresh(rating)
    return rating


@router.get("/{order_id}/ratings", response_model=list[RatingResponse])
async def get_ratings(
    order_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all ratings for an order. Only participants can view."""
    # Verify user is orderer OR deliverer
    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found",
        )
    if user.id not in (order.orderer_id, order.deliverer_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only order participants can view ratings",
        )

    ratings = await get_order_ratings(db, order_id)
    return ratings
