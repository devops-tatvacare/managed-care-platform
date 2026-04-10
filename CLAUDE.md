# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Bradesco Care Admin — a production healthcare patient support program (PSP) management platform. Full-stack: Next.js 15 frontend + FastAPI backend + PostgreSQL. Despite living in `prototypes/`, treat as production-grade.

## Commands

```bash
# Frontend
pnpm dev              # Next.js dev server (port 3000, Turbopack)
pnpm build            # Production build
pnpm lint             # ESLint

# Backend
pnpm setup:backend    # Create venv + install dependencies
pnpm dev:backend      # Uvicorn with reload (port 8000)

# Both
pnpm dev:all          # Frontend + backend concurrently

# Docker (full stack: PostgreSQL + FastAPI + Next.js)
docker-compose up
docker-compose build
```

## Architecture

**Frontend** (Next.js 15 / React 19 / TypeScript): App Router with path alias `@/*` → `src/*`. Zustand stores per feature in `src/stores/`. API clients in `src/services/api/` using centralized `apiRequest()` from `client.ts`. Radix UI primitives in `src/components/ui/`, feature components in `src/features/`.

**Backend** (FastAPI / SQLAlchemy 2.0 async / PostgreSQL 16): Routers in `backend/app/routers/`, services in `backend/app/services/`, Pydantic schemas in `backend/app/schemas/`, SQLAlchemy models in `backend/app/models/`. JWT auth via `backend/app/auth/` with `get_auth()` dependency injection.

**API proxy**: Frontend routes `/api/*` to backend via Next.js rewrites in `next.config.ts`. Streaming AI endpoints use SSE format.

**AI/LLM**: Google Gemini 2.5-Flash via `backend/app/llm/`. AI builder surface system in `backend/app/ai_builder/`. Streaming responses for care summaries, pathway generation, population insights.

**Background work**: Cohortisation worker (`backend/app/workers/`) runs as asyncio task on app startup. Scoring engine in `backend/app/engine/`.

## Key Patterns

- **State**: Zustand stores fetch data via API service functions, not directly from components
- **Styling**: Tailwind CSS 4.0. Use `cn()` for conditional classes (never template literal concatenation). Check light/dark mode. Use CSS variables for colors, not hardcoded hex
- **Multi-tenant**: All data scoped by `tenant_id` extracted from JWT auth context
- **Database**: Async SQLAlchemy with `asyncpg`. Models inherit from `Base` in `models/base.py`
- **Seeding**: `backend/app/services/seed_service.py` coordinates initial data population on startup
- **Config**: Backend uses Pydantic Settings (`backend/app/config.py`), reads `.env` / `.env.local`

## Environment Variables

Backend expects: `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGINS`, `GEMINI_API_KEY`, `LLM_DEFAULT_MODEL`

## Route Structure

- `/dashboard` — Command center (KPIs, action queue, AI insights)
- `/dashboard/patients` — Patient list and detail views
- `/dashboard/pathways` — Visual pathway builder (XyFlow)
- `/dashboard/cohortisation` — Cohort builder, scoring, assignments
- `/dashboard/communications` — Message templates and orchestration
- `/dashboard/outcomes` — Clinical, HEDIS, financial metrics
