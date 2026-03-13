import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, String, Float, Integer, Text, DateTime, JSON, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class Order(Base):
    """SQLAlchemy model for the orders table."""

    __tablename__ = "orders"

    id: Mapped[str] = mapped_column(
        String, primary_key=True, default=lambda: str(uuid.uuid4())
    )
    orderer_id: Mapped[str] = mapped_column(
        String, ForeignKey("users.id"), nullable=False
    )
    deliverer_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("users.id"), nullable=True, default=None
    )
    status: Mapped[str] = mapped_column(String, nullable=False, default="pending")
    canteen: Mapped[str] = mapped_column(String, nullable=False)
    items: Mapped[list] = mapped_column(JSON, nullable=False)
    total_price: Mapped[float] = mapped_column(Float, nullable=False)
    delivery_hall: Mapped[str] = mapped_column(String, nullable=False)
    delivery_preference: Mapped[str] = mapped_column(String, nullable=False)
    qr_code_image: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)
    qr_code_data: Mapped[str | None] = mapped_column(
        String, nullable=True, default=None
    )
    note: Mapped[str | None] = mapped_column(String, nullable=True, default=None)
    group_order_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("orders.id"), nullable=True, default=None
    )
    is_group_open: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    accepted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, default=None
    )
    picked_up_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, default=None
    )
    delivered_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, default=None
    )
    cancelled_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, default=None
    )
