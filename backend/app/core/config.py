from pydantic_settings import BaseSettings


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

    UPLOAD_DIR: str
    REPORT_DIR: str

    class Config:
        env_file = ".env"


settings = Settings()