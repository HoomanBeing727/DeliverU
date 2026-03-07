from pydantic import BaseModel


class LeaderboardEntry(BaseModel):
    """A single entry in the leaderboard."""

    user_id: str
    nickname: str
    value: float
    total_orders: int | None = None
    total_ratings: int | None = None


class LeaderboardResponse(BaseModel):
    """Response containing top orderers and deliverers."""

    top_orderers: list[LeaderboardEntry]
    top_deliverers: list[LeaderboardEntry]
