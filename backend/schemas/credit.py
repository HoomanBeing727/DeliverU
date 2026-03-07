from datetime import datetime

from pydantic import BaseModel


class CreditBalanceResponse(BaseModel):
    """Schema for returning credit balance."""

    credits: int


class CreditTransactionResponse(BaseModel):
    """Schema for returning a single credit transaction."""

    id: str
    user_id: str
    amount: int
    reason: str
    order_id: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class CreditHistoryResponse(BaseModel):
    """Schema for returning credit transaction history."""

    transactions: list[CreditTransactionResponse]
