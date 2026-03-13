import uuid
from datetime import datetime, timezone

from sqlalchemy import String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class GroupOrderJoinRequest(Base):
    """SQLAlchemy model for group order join request approval workflow."""

    __tablename__ = "group_order_join_requests"
    __table_args__ = (UniqueConstraint("root_order_id", "requester_id"),)

    id: Mapped[str] = mapped_column(
        String, primary_key=True, default=lambda: str(uuid.uuid4())
    )
    root_order_id: Mapped[str] = mapped_column(
        String, ForeignKey("orders.id"), nullable=False
    )
    requester_id: Mapped[str] = mapped_column(
        String, ForeignKey("users.id"), nullable=False
    )
    status: Mapped[str] = mapped_column(String, nullable=False, default="pending")
    note: Mapped[str | None] = mapped_column(String, nullable=True, default=None)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    decided_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, default=None
    )
    decided_by_user_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("users.id"), nullable=True, default=None
    )
    child_order_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("orders.id"), nullable=True, default=None
    )
    decision_reason: Mapped[str | None] = mapped_column(
        String, nullable=True, default=None
    )
