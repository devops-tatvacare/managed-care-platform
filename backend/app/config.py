from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "sqlite+aiosqlite:///./data/care-admin.db"
    jwt_secret: str = "dev-secret-change-in-production"
    jwt_algorithm: str = "HS256"
    jwt_access_expire_minutes: int = 60
    jwt_refresh_expire_days: int = 7
    cors_origins: list[str] = ["http://localhost:3000"]
    gemini_api_key: str = ""
    llm_default_provider: str = "gemini"
    llm_default_model: str = "gemini-2.0-flash"
    llm_timeout: int = 30
    llm_max_retries: int = 2

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
