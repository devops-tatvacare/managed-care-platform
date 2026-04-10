import asyncio
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import async_session, engine
from app.models import Base
from app.routers import actions, ai, ai_sessions, auth, cohortisation, command_center, communications, outcomes, pathways, patients, programs, search
from app.ai_builder.router import router as ai_builder_router
from app.ai_builder.surfaces import register_all_surfaces
from app.services.seed_service import seed_all
from app.services.search_sync import register_search_sync
from app.workers import cohortisation_worker


@asynccontextmanager
async def lifespan(app: FastAPI):
    os.makedirs("data", exist_ok=True)
    register_all_surfaces()
    register_search_sync()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with async_session() as db:
        await seed_all(db)

    # Rebuild search index after seeding (idempotent — skips if index already populated)
    from app.services.search_service import rebuild_index
    async with async_session() as db:
        count = await rebuild_index(db)
        if count > 0:
            await db.commit()

    # Start cohortisation worker
    shutdown_event = asyncio.Event()
    worker_task = asyncio.create_task(cohortisation_worker.run(shutdown_event))

    yield

    shutdown_event.set()
    worker_task.cancel()
    try:
        await worker_task
    except asyncio.CancelledError:
        pass


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
    (programs.router, "/api/programs", ["Programs"]),
    (cohortisation.router, "/api/cohortisation", ["Cohortisation"]),
    (command_center.router, "/api/command-center", ["Command Center"]),
    (communications.router, "/api/communications", ["Communications"]),
    (outcomes.router, "/api/outcomes", ["Outcomes"]),
    (ai.router, "/api/ai", ["AI"]),
    (ai_sessions.router, "/api/ai/sessions", ["AI Sessions"]),
    (actions.router, "/api/actions", ["Actions"]),
    (search.router, "/api/search", ["Search"]),
    (ai_builder_router, "/api/ai/builder", ["AI Builder"]),
]

for router, prefix, tags in ROUTER_REGISTRY:
    app.include_router(router, prefix=prefix, tags=tags)
