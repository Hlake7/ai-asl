from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    model_path: Path = Path("artifacts/models/classifier.pkl")
    confidence_threshold: float = 0.85
    hold_duration_ms: int = 300
    port: int = 8000

    class Config:
        env_file = ".env"


settings = Settings()
