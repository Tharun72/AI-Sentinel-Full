from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.projects import router as projects_router
from app.core.config import settings
from app.database.init_db import init_db
from app.api.auth import router as auth_router
from app.api.scans import router as scans_router
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(projects_router)
app.include_router(scans_router)

@app.on_event("startup")
def startup():
    init_db()


app.include_router(auth_router)


@app.get("/")
def home():
    return {
        "message": "AI Sentinel Backend Running"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy"
    }