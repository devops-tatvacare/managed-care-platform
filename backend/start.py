"""Startup script: ensure schema is up-to-date, then launch uvicorn."""

import asyncio
import subprocess
import sys

from sqlalchemy import text

from app.database import engine
from app.models import Base  # noqa: F401 — registers all models


async def ensure_schema() -> None:
    """Create base tables if missing, then run Alembic migrations."""

    # 1. Create all tables that don't exist yet (idempotent)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # 2. Ensure alembic_version table exists and has a baseline stamp
    async with engine.begin() as conn:
        result = await conn.execute(
            text(
                "SELECT EXISTS ("
                "  SELECT 1 FROM information_schema.tables"
                "  WHERE table_name = 'alembic_version'"
                ")"
            )
        )
        has_alembic = result.scalar()

        if not has_alembic:
            # First run — stamp baseline so Alembic knows create_all already ran
            subprocess.run(
                [sys.executable, "-m", "alembic", "stamp", "0001"],
                check=True,
            )

    # 3. Apply any pending migrations (0002+)
    subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head"],
        check=True,
    )

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(ensure_schema())
