from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from middleware.auth_middleware import get_current_user
from models.user import User
from schemas.user import (
    ProfileSetupRequest,
    ProfileResponse,
    DarkModeToggle,
    DelivererToggle,
    VALID_HALLS,
    VALID_TAKE_ORDER_LOCATIONS,
    VALID_DELIVERY_HABITS,
)


router = APIRouter(prefix="/users", tags=["users"])


def _user_to_response(user: User) -> ProfileResponse:
    """Convert a User ORM instance to a ProfileResponse."""
    return ProfileResponse(
        id=str(user.id),
        email=user.email,
        nickname=user.nickname,
        dorm_hall=user.dorm_hall,
        order_times=user.order_times,
        pref_take_order_location=user.pref_take_order_location,
        pref_delivery_habit=user.pref_delivery_habit,
        is_deliverer=user.is_deliverer,
        available_return_times=user.available_return_times,
        preferred_delivery_halls=user.preferred_delivery_halls,
        dark_mode=user.dark_mode,
        profile_completed=user.profile_completed,
    )


@router.get("/me", response_model=ProfileResponse)
async def get_profile(user: User = Depends(get_current_user)):
    """Return the authenticated user's profile."""
    return _user_to_response(user)


@router.put("/me/profile", response_model=ProfileResponse)
async def setup_profile(
    body: ProfileSetupRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create or update the user's profile."""
    if body.dorm_hall not in VALID_HALLS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid dorm hall. Must be one of: {VALID_HALLS}",
        )

    if body.pref_take_order_location not in VALID_TAKE_ORDER_LOCATIONS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid location. Must be one of: {VALID_TAKE_ORDER_LOCATIONS}",
        )

    if body.pref_delivery_habit not in VALID_DELIVERY_HABITS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid delivery habit. Must be one of: {VALID_DELIVERY_HABITS}",
        )

    user.nickname = body.nickname
    user.dorm_hall = body.dorm_hall
    user.order_times = body.order_times
    user.pref_take_order_location = body.pref_take_order_location
    user.pref_delivery_habit = body.pref_delivery_habit
    user.is_deliverer = body.is_deliverer
    user.profile_completed = True

    if body.is_deliverer:
        if not body.available_return_times:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Deliverers must provide available_return_times",
            )
        if not body.preferred_delivery_halls:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Deliverers must provide preferred_delivery_halls",
            )

        invalid_halls = [
            h for h in body.preferred_delivery_halls if h not in VALID_HALLS
        ]
        if invalid_halls:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid delivery halls: {invalid_halls}",
            )

        user.available_return_times = body.available_return_times
        user.preferred_delivery_halls = body.preferred_delivery_halls
    else:
        user.available_return_times = None
        user.preferred_delivery_halls = None

    await db.commit()
    await db.refresh(user)
    return _user_to_response(user)


@router.patch("/me/dark-mode", response_model=ProfileResponse)
async def toggle_dark_mode(
    body: DarkModeToggle,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Toggle dark mode for the authenticated user."""
    user.dark_mode = body.dark_mode
    await db.commit()
    await db.refresh(user)
    return _user_to_response(user)


@router.patch("/me/deliverer-toggle", response_model=ProfileResponse)
async def toggle_deliverer(
    body: DelivererToggle,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Toggle deliverer status for the authenticated user."""
    user.is_deliverer = body.is_deliverer
    await db.commit()
    await db.refresh(user)
    return _user_to_response(user)
