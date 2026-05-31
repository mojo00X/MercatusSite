from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DATABASE_URL: str 
    JWT_SECRET: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 10080  # 1 week
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    STRIPE_PUBLISHABLE_KEY: str = ""
    # Percent of each boutique item's gross that the platform retains.
    # 10.0 means the boutique gets 90% of the line subtotal; the rest stays
    # on the platform balance.
    PLATFORM_FEE_PERCENT: float = 10.0
    FRONTEND_URL: str = "http://localhost:5173,https://mercatussitee.onrender.com"

    model_config = SettingsConfigDict(env_file=".env")


settings = Settings()
