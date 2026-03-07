from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.user import User
from models.credit_transaction import CreditTransaction


async def get_balance(db: AsyncSession, user_id: str) -> int:
    """Get the current credit balance for a user."""
    result = await db.execute(select(User.credits).where(User.id == user_id))
    credits = result.scalar_one_or_none()
    if credits is None:
        return 0
    return credits


async def deduct_credit(
    db: AsyncSession, user: User, amount: int, reason: str, order_id: str | None = None
) -> None:
    """Deduct credits from a user and record the transaction."""
    user.credits -= amount
    tx = CreditTransaction(
        user_id=user.id,
        amount=-amount,
        reason=reason,
        order_id=order_id,
    )
    db.add(tx)


async def add_credit(
    db: AsyncSession, user: User, amount: int, reason: str, order_id: str | None = None
) -> None:
    """Add credits to a user and record the transaction."""
    user.credits += amount
    tx = CreditTransaction(
        user_id=user.id,
        amount=amount,
        reason=reason,
        order_id=order_id,
    )
    db.add(tx)


async def grant_initial_credits(db: AsyncSession, user: User) -> None:
    """Grant initial 100 credits to a newly registered user (ledger record only, default already set on model)."""
    tx = CreditTransaction(
        user_id=user.id,
        amount=100,
        reason="initial_credits",
    )
    db.add(tx)


async def get_history(db: AsyncSession, user_id: str) -> list[CreditTransaction]:
    """Get credit transaction history for a user, ordered by most recent first."""
    result = await db.execute(
        select(CreditTransaction)
        .where(CreditTransaction.user_id == user_id)
        .order_by(CreditTransaction.created_at.desc())
    )
    return list(result.scalars().all())
