from datetime import datetime

from pydantic import BaseModel, field_validator

from schemas.user import VALID_HALLS


VALID_CANTEENS = ["LG1"]

VALID_ORDER_STATUSES = ["pending", "accepted", "picked_up", "delivered", "cancelled"]


class OrderItemSchema(BaseModel):
    """Schema for a single order item."""

    name: str
    qty: int
    price: float


class OrderCreateRequest(BaseModel):
    """Schema for creating a new order."""

    canteen: str
    items: list[OrderItemSchema]
    total_price: float
    delivery_hall: str
    note: str | None = None
    qr_code_image: str | None = None
    qr_code_data: str | None = None

    @field_validator("canteen")
    @classmethod
    def valid_canteen(cls, v: str) -> str:
        if v not in VALID_CANTEENS:
            raise ValueError(f"Invalid canteen. Must be one of: {VALID_CANTEENS}")
        return v

    @field_validator("delivery_hall")
    @classmethod
    def valid_delivery_hall(cls, v: str) -> str:
        if v not in VALID_HALLS:
            raise ValueError(f"Invalid delivery hall. Must be one of: {VALID_HALLS}")
        return v


class OrderResponse(BaseModel):
    """Schema for returning order data."""

    id: str
    orderer_id: str
    deliverer_id: str | None
    status: str
    canteen: str
    items: list[OrderItemSchema]
    total_price: float
    delivery_hall: str
    delivery_preference: str
    qr_code_image: str | None
    qr_code_data: str | None
    note: str | None
    orderer_nickname: str
    deliverer_nickname: str | None
    created_at: datetime
    accepted_at: datetime | None
    picked_up_at: datetime | None
    delivered_at: datetime | None
    cancelled_at: datetime | None

    model_config = {"from_attributes": True}


class OrderStatusUpdate(BaseModel):
    """Schema for updating order status."""

    status: str

    @field_validator("status")
    @classmethod
    def valid_status(cls, v: str) -> str:
        if v not in VALID_ORDER_STATUSES:
            raise ValueError(
                f"Invalid status. Must be one of: {VALID_ORDER_STATUSES}"
            )
        return v
