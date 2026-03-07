from datetime import datetime

from pydantic import BaseModel, field_validator


class RateRequest(BaseModel):
    """Schema for rating a user."""

    stars: int
    feedback: str | None = None

    @field_validator("stars")
    @classmethod
    def valid_stars(cls, v: int) -> int:
        if v not in range(1, 6):
            raise ValueError("Stars must be between 1 and 5")
        return v


class RatingResponse(BaseModel):
    """Schema for returning rating data."""

    id: str
    order_id: str
    rater_id: str
    ratee_id: str
    stars: int
    feedback: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
