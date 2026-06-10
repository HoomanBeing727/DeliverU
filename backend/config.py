from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables / .env file."""

    database_url: str
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    jwt_expiry_hours: int = 72

    model_config = {"env_file": ".env"}

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.database_url = self._normalize_database_url(self.database_url)

    @staticmethod
    def _normalize_database_url(url: str) -> str:
        if url.startswith("postgres://"):
            return url.replace("postgres://", "postgresql+asyncpg://", 1)
        if url.startswith("postgresql://") and not url.startswith("postgresql+asyncpg://"):
            return url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return url


settings = Settings()
