import uuid

from sqlalchemy import String, Boolean, JSON, Integer, Float
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class User(Base):
    """SQLAlchemy model for the users table."""

    __tablename__ = "users"

    id: Mapped[str] = mapped_column(
        String, primary_key=True, default=lambda: str(uuid.uuid4())
    )
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String, nullable=False)

    nickname: Mapped[str | None] = mapped_column(String, nullable=True, default=None)
    dorm_hall: Mapped[str | None] = mapped_column(String, nullable=True, default=None)
    order_times: Mapped[list | None] = mapped_column(JSON, nullable=True, default=None)
    pref_take_order_location: Mapped[str | None] = mapped_column(
        String, nullable=True, default=None
    )
    pref_delivery_habit: Mapped[str | None] = mapped_column(
        String, nullable=True, default=None
    )

    is_deliverer: Mapped[bool] = mapped_column(Boolean, default=False)
    available_return_times: Mapped[list | None] = mapped_column(
        JSON, nullable=True, default=None
    )
    preferred_delivery_halls: Mapped[list | None] = mapped_column(
        JSON, nullable=True, default=None
    )

    dark_mode: Mapped[bool] = mapped_column(Boolean, default=False)
    credits: Mapped[int] = mapped_column(Integer, default=100)
    profile_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    average_rating: Mapped[float | None] = mapped_column(Float, nullable=True, default=None)
    total_ratings: Mapped[int] = mapped_column(Integer, default=0)
