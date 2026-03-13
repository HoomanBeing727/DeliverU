import uuid
from datetime import datetime, timezone

from sqlalchemy import String, Integer, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class Rating(Base):
    """SQLAlchemy model for the ratings table."""

    __tablename__ = "ratings"

    id: Mapped[str] = mapped_column(
        String, primary_key=True, default=lambda: str(uuid.uuid4())
    )
    order_id: Mapped[str] = mapped_column(
        String, ForeignKey("orders.id"), nullable=False
    )
    rater_id: Mapped[str] = mapped_column(
        String, ForeignKey("users.id"), nullable=False
    )
    ratee_id: Mapped[str] = mapped_column(
        String, ForeignKey("users.id"), nullable=False
    )
    stars: Mapped[int] = mapped_column(Integer, nullable=False)
    feedback: Mapped[str | None] = mapped_column(String, nullable=True, default=None)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
