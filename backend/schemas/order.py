from datetime import datetime
from typing import ClassVar

from pydantic import BaseModel, ConfigDict, field_validator

from schemas.user import VALID_HALLS


VALID_CANTEENS = ["LG1", "LSK", "Asia Pacific", "Oliver Super Sandwich"]

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
    is_group_open: bool = False

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
    group_order_id: str | None
    is_group_open: bool
    participant_count: int = 0
    orderer_nickname: str
    deliverer_nickname: str | None
    created_at: datetime
    accepted_at: datetime | None
    picked_up_at: datetime | None
    delivered_at: datetime | None
    cancelled_at: datetime | None

    model_config: ClassVar[ConfigDict] = ConfigDict(from_attributes=True)


class OrderStatusUpdate(BaseModel):
    """Schema for updating order status."""

    status: str

    @field_validator("status")
    @classmethod
    def valid_status(cls, v: str) -> str:
        if v not in VALID_ORDER_STATUSES:
            raise ValueError(f"Invalid status. Must be one of: {VALID_ORDER_STATUSES}")
        return v


class GroupOrderJoinRequestCreate(BaseModel):
    """Schema for creating a join request to a group order."""

    note: str | None = None


GroupOrderJoinRequest = GroupOrderJoinRequestCreate


class GroupOrderJoinRequestResponse(BaseModel):
    """Schema for returning join request data."""

    id: str
    root_order_id: str
    requester_id: str
    requester_nickname: str
    status: str
    note: str | None
    created_at: datetime
    decided_at: datetime | None
    decided_by_user_id: str | None
    decision_reason: str | None

    model_config: ClassVar[ConfigDict] = ConfigDict(from_attributes=True)


class GroupOrderJoinRequestDecision(BaseModel):
    """Schema for responding to a join request."""

    reason: str | None = None


class GroupOrderResponse(BaseModel):
    """Schema for group order summary."""

    root_order: OrderResponse
    participants: list[OrderResponse]
    total_participants: int
    is_open: bool
    my_join_request: GroupOrderJoinRequestResponse | None = None
    pending_join_requests_count: int = 0
