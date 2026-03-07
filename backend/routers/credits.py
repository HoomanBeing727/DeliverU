from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from middleware.auth_middleware import get_current_user
from models.user import User
from schemas.credit import CreditBalanceResponse, CreditHistoryResponse, CreditTransactionResponse
from services.credit_service import get_history


router = APIRouter(prefix="/credits", tags=["credits"])


@router.get("/balance", response_model=CreditBalanceResponse)
async def get_credit_balance(user: User = Depends(get_current_user)):
    """Get the authenticated user's credit balance."""
    return CreditBalanceResponse(credits=user.credits)


@router.get("/history", response_model=CreditHistoryResponse)
async def get_credit_history(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the authenticated user's credit transaction history."""
    transactions = await get_history(db, str(user.id))
    return CreditHistoryResponse(
        transactions=[
            CreditTransactionResponse(
                id=str(tx.id),
                user_id=str(tx.user_id),
                amount=tx.amount,
                reason=tx.reason,
                order_id=str(tx.order_id) if tx.order_id else None,
                created_at=tx.created_at,
            )
            for tx in transactions
        ]
    )
