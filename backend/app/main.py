from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.audit import router as audit_router
from app.api.auth import router as auth_router
from app.api.projects import router as projects_router
from app.api.scans import router as scans_router
from app.core.config import settings
from app.database.init_db import init_db


cors_origins = [origin.strip() for origin in settings.CORS_ORIGINS.split(",") if origin.strip()]

app = FastAPI(title=settings.APP_NAME, version=settings.APP_VERSION)
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(scans_router)
app.include_router(projects_router)
app.include_router(audit_router)
app.include_router(auth_router)


@app.on_event("startup")
def startup():
    init_db()


@app.get("/")
def home():
    return {"message": "AI Sentinel Backend Running"}


@app.get("/health")
def health():
    return {"status": "healthy"}
