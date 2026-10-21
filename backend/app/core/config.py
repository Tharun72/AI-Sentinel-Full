from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


BACKEND_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    APP_NAME: str
    APP_VERSION: str

    HOST: str
    PORT: int

    DATABASE_URL: str

    SECRET_KEY: str
    ALGORITHM: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int

    OLLAMA_URL: str
    OLLAMA_MODEL: str = "qwen2.5-coder:7b"
    OLLAMA_CONNECT_TIMEOUT_SECONDS: int = 10
    OLLAMA_READ_TIMEOUT_SECONDS: int = 20
    AI_MAX_SOURCE_CONTEXT_CHARS: int = 2_000
    AI_ENABLED: bool = True
    AI_MAX_FINDINGS: int = 20
    AI_ENRICHMENT_CONCURRENCY: int = 2
    AI_MAX_DURATION_SECONDS: int = 120

    # Only public HTTPS repositories are supported. Add trusted hosts here when
    # scanning a self-hosted Git service, for example "git.example.com".
    GIT_ALLOWED_HOSTS: str = "github.com,gitlab.com,bitbucket.org"
    GIT_CLONE_TIMEOUT_SECONDS: int = 120
    SCAN_MAX_FILE_SIZE_BYTES: int = 1_000_000
    SCAN_MAX_FILES: int = 10_000
    SCAN_MAX_REPOSITORY_SIZE_BYTES: int = 500_000_000
    SCAN_TOTAL_TIMEOUT_SECONDS: int = 600
    SCAN_PROGRESS_UPDATE_INTERVAL_SECONDS: float = 0.5
    STALE_SCAN_TIMEOUT_SECONDS: int = 900

    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"

    UPLOAD_DIR: str
    REPORT_DIR: str

    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env",
        extra="ignore",
    )


settings = Settings()
