from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import APIRouter, Depends

from database import get_db
from models.order import Order
from models.user import User
from schemas.stats import LeaderboardEntry, LeaderboardResponse


router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("/leaderboard", response_model=LeaderboardResponse)
async def get_leaderboard(db: AsyncSession = Depends(get_db)):
    """Get public leaderboard with top orderers and deliverers."""
    # Query top orderers by delivered order count
    orderer_stmt = (
        select(
            Order.orderer_id,
            func.count(Order.id).label("order_count"),
        )
        .where(Order.status == "delivered")
        .group_by(Order.orderer_id)
        .order_by(func.count(Order.id).desc())
        .limit(5)
    )
    orderer_result = await db.execute(orderer_stmt)
    orderer_data = orderer_result.all()

    top_orderers: list[LeaderboardEntry] = []
    for orderer_id, order_count in orderer_data:
        user_result = await db.execute(select(User).where(User.id == orderer_id))
        user = user_result.scalar_one_or_none()
        if user:
            top_orderers.append(
                LeaderboardEntry(
                    user_id=str(user.id),
                    nickname=user.nickname or "Unknown",
                    value=float(order_count),
                    total_orders=int(order_count),
                )
            )

    # Query top deliverers by rating
    deliverer_stmt = (
        select(User)
        .where(User.total_ratings > 0)
        .order_by(User.average_rating.desc(), User.total_ratings.desc())
        .limit(5)
    )
    deliverer_result = await db.execute(deliverer_stmt)
    deliverers = deliverer_result.scalars().all()

    top_deliverers: list[LeaderboardEntry] = [
        LeaderboardEntry(
            user_id=str(user.id),
            nickname=user.nickname or "Unknown",
            value=user.average_rating or 0.0,
            total_ratings=user.total_ratings,
        )
        for user in deliverers
    ]

    return LeaderboardResponse(
        top_orderers=top_orderers,
        top_deliverers=top_deliverers,
    )
