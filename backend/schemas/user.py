import re

from pydantic import BaseModel, field_validator


VALID_HALLS = [
    f"Hall {r}"
    for r in [
        "I",
        "II",
        "III",
        "IV",
        "V",
        "VI",
        "VII",
        "VIII",
        "IX",
        "X",
        "XI",
        "XII",
        "XIII",
    ]
]

VALID_TAKE_ORDER_LOCATIONS = ["dorm_room", "hall_lobby"]
VALID_DELIVERY_HABITS = ["floor", "door_handle", "hand_to_hand"]


class ProfileSetupRequest(BaseModel):
    """Schema for initial profile setup."""

    nickname: str

    @field_validator("nickname")
    @classmethod
    def nickname_rules(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Nickname cannot be empty")
        if len(v) < 2:
            raise ValueError("Nickname must be at least 2 characters")
        if len(v) > 20:
            raise ValueError("Nickname must be at most 20 characters")
        if ' ' in v:
            raise ValueError("Nickname cannot contain spaces")
        return v
    dorm_hall: str
    order_times: list[str]
    pref_take_order_location: str
    pref_delivery_habit: str

    # Optional deliverer fields
    is_deliverer: bool = False
    available_return_times: list[str] | None = None
    preferred_delivery_halls: list[str] | None = None


class ProfileResponse(BaseModel):
    """Schema for returning user profile data."""

    id: str
    email: str
    nickname: str | None
    dorm_hall: str | None
    order_times: list[str] | None
    pref_take_order_location: str | None
    pref_delivery_habit: str | None
    is_deliverer: bool
    available_return_times: list[str] | None
    preferred_delivery_halls: list[str] | None
    dark_mode: bool
    profile_completed: bool
    credits: int

    model_config = {"from_attributes": True}


class DarkModeToggle(BaseModel):
    """Schema for toggling dark mode."""

    dark_mode: bool


class DelivererToggle(BaseModel):
    """Schema for toggling deliverer status."""

    is_deliverer: bool
