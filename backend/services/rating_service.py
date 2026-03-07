from fastapi import HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.order import Order
from models.rating import Rating
from models.user import User


async def submit_rating(
    db: AsyncSession,
    order_id: str,
    rater_id: str,
    stars: int,
    feedback: str | None = None,
) -> Rating:
    """Submit or update a rating for an order. Recalculates ratee stats."""
    # Query order — must exist and status == "delivered"
    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found",
        )
    if order.status != "delivered":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Order must be delivered before rating",
        )

    # Verify rater is orderer OR deliverer
    if rater_id not in (order.orderer_id, order.deliverer_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only order participants can submit ratings",
        )

    # Determine ratee: if rater == orderer → ratee = deliverer, else ratee = orderer
    if rater_id == order.orderer_id:
        ratee_id = order.deliverer_id
    else:
        ratee_id = order.orderer_id

    # Check existing rating (upsert logic)
    result = await db.execute(
        select(Rating).where(
            (Rating.order_id == order_id) & (Rating.rater_id == rater_id)
        )
    )
    existing_rating = result.scalar_one_or_none()

    if existing_rating:
        # Update existing rating
        existing_rating.stars = stars
        existing_rating.feedback = feedback
        rating = existing_rating
    else:
        # Create new rating
        rating = Rating(
            order_id=order_id,
            rater_id=rater_id,
            ratee_id=ratee_id,
            stars=stars,
            feedback=feedback,
        )
        db.add(rating)

    # Recalculate ratee stats
    result = await db.execute(select(User).where(User.id == ratee_id))
    ratee = result.scalar_one_or_none()
    if ratee:
        # Query all ratings for this ratee
        result = await db.execute(
            select(func.avg(Rating.stars), func.count(Rating.id)).where(
                Rating.ratee_id == ratee_id
            )
        )
        avg_stars, total_count = result.one()
        ratee.average_rating = float(avg_stars) if avg_stars else None
        ratee.total_ratings = total_count or 0

    return rating


async def get_order_ratings(db: AsyncSession, order_id: str) -> list[Rating]:
    """Get all ratings for an order."""
    result = await db.execute(select(Rating).where(Rating.order_id == order_id))
    return list(result.scalars().all())
