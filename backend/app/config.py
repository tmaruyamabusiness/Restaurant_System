from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    APP_NAME: str = "Restaurant Order Management System"
    DEBUG: bool = False

    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/restaurant"
    DATABASE_URL_SYNC: str = "postgresql://postgres:postgres@localhost:5432/restaurant"

    REDIS_URL: str = "redis://localhost:6379/0"

    SECRET_KEY: str = "change-me-in-production-use-a-long-random-string"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    TAX_RATE_STANDARD: float = 0.10
    TAX_RATE_REDUCED: float = 0.08

    model_config = {"env_file": ".env", "extra": "ignore"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
