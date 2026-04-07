import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import async_session, engine
from app.models import Base
from app.routers import ai, ai_sessions, auth, pathways, patients
from app.services.seed_service import seed_all


@asynccontextmanager
async def lifespan(app: FastAPI):
    os.makedirs("data", exist_ok=True)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with async_session() as db:
        await seed_all(db)
    yield


app = FastAPI(title="Bradesco Care Admin API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ROUTER_REGISTRY = [
    (auth.router, "/api/auth", ["Auth"]),
    (patients.router, "/api/patients", ["Patients"]),
    (pathways.router, "/api/pathways", ["Pathways"]),
    (ai.router, "/api/ai", ["AI"]),
    (ai_sessions.router, "/api/ai/sessions", ["AI Sessions"]),
]

for router, prefix, tags in ROUTER_REGISTRY:
    app.include_router(router, prefix=prefix, tags=tags)
