# Production Upgrade Checklist

Items identified during prototyping that need to be addressed before production deployment. Updated across phases as new items surface.

---

## Infrastructure

- [ ] **Database: SQLite → PostgreSQL** — Switch `DATABASE_URL` to PostgreSQL. SQLAlchemy async works with `asyncpg`. All models use standard SQL types; `JSON` columns become `JSONB`. Test concurrent writes under load.
- [ ] **Migrations: Add Alembic** — Currently using `Base.metadata.create_all` on startup (wipes and recreates). Set up Alembic for incremental migrations. Generate initial migration from current models.
- [ ] **Task queue: DB polling → ARQ/Celery** — The cohortisation worker polls `cohortisation_events` table every 5 seconds. Replace with ARQ (async Redis queue) or Celery with Redis/RabbitMQ broker. Keep the events table as audit log, not the queue. The `emit_event()` call becomes `await queue.enqueue(...)`. Scoring logic is unchanged.
- [ ] **Worker process isolation** — Worker currently runs as `asyncio.create_task` inside FastAPI process. Move to a separate process/container so web server and worker scale independently. Docker Compose gets a `worker` service.
- [ ] **Redis** — Needed for task queue (ARQ/Celery broker), session caching, and rate limiting. Add Redis service to docker-compose.

## Security

- [ ] **JWT secret** — Currently hardcoded `dev-secret-change-in-production` in config. Move to env var with validation that it's not the default.
- [ ] **Password hashing** — Verify bcrypt rounds are production-appropriate (currently using passlib defaults).
- [ ] **CORS origins** — Currently `["*"]` or `http://localhost:3000`. Lock down to actual deployment domains.
- [ ] **Rate limiting** — No rate limiting on any endpoint. Add slowapi or similar middleware, especially on `/api/auth/login` and `/api/cohortisation/recalculate`.
- [ ] **Input validation** — Pydantic handles basic validation. Audit all JSON config fields (scoring tables, criteria trees) for injection risks. CriteriaNode configs are evaluated by the engine — ensure no code execution paths.

## Data

- [ ] **Seed data removal** — The 500 synthetic patients, demo tenant, and `admin123` password are seeded on every fresh DB. Production startup should not run seeds. Gate behind `SEED_DATA=true` env var.
- [ ] **Tenant isolation audit** — All queries filter by `tenant_id`, but audit every endpoint and service function to confirm. One missed filter = cross-tenant data leak.
- [ ] **Patient data encryption** — PII fields (name, DOB, CPF, email, phone, address) are stored in plaintext. Evaluate column-level encryption or application-level encryption for PHI compliance.
- [ ] **Audit logging** — CohortAssignment table logs assignment changes. Add general audit logging for all write operations (who changed what, when) for compliance.

## Cohortisation Engine

- [ ] **Event deduplication** — If two lab results arrive for the same patient within seconds, two events are emitted and processed sequentially. The second run may be redundant. Add deduplication (skip if patient was scored within last N seconds) or use idempotency keys.
- [ ] **Batch efficiency** — Worker processes events one-by-one with individual DB queries per patient. For bulk recalculation (500+ patients), batch the patient data loading and scoring. Current approach works but is O(N) DB round trips.
- [ ] **Scoring engine versioning** — When a scoring engine config changes, existing assignments were made under the old config. Decide: re-score everyone immediately? Or mark assignments as "stale" and queue re-scoring? Currently no handling for this.
- [ ] **Dead letter queue** — Failed events get `status="failed"` with error text. No retry mechanism, no alerting. Add: exponential backoff retry (3 attempts), dead letter status after max retries, alerting on DLQ depth.
- [ ] **Concurrent assignment writes** — Two workers processing events for the same patient could race on `is_current` flag updates. Add `SELECT ... FOR UPDATE` or advisory locks when writing assignments.

## Frontend

- [ ] **Error boundaries** — No React error boundaries. Add per-page error boundaries so one component crash doesn't take down the whole app.
- [ ] **Loading states** — Skeleton loaders exist for some pages but not all. Audit every page that fetches data on mount.
- [ ] **Optimistic updates** — Pathway builder uses optimistic updates for blocks. Cohort builder currently does full reload after every mutation. Evaluate where optimistic updates improve UX.
- [ ] **Bundle size** — Recharts adds ~45KB to the cohortisation page. Evaluate dynamic imports (`next/dynamic`) for chart components.

## Observability

- [ ] **Structured logging** — Currently using Python `logging` with default format. Switch to structured JSON logging (structlog or python-json-logger) for log aggregation.
- [ ] **Health check endpoint** — No `/health` or `/ready` endpoint. Add one that checks DB connectivity and worker status.
- [ ] **Metrics** — No Prometheus/StatsD metrics. Add: request latency, cohortisation event processing time, queue depth, assignment counts by program/cohort.
- [ ] **Error tracking** — No Sentry or equivalent. Add error tracking for both backend exceptions and frontend errors.

## DevOps

- [ ] **CI/CD** — No pipeline. Add: lint, typecheck, build, test stages. Gate deployment on passing checks.
- [ ] **Docker image optimization** — Backend Dockerfile uses `pip freeze` which includes dev dependencies. Use a requirements-prod.txt or poetry export. Frontend multi-stage build is already lean.
- [ ] **Environment config** — Settings come from `app/config.py` with hardcoded defaults. Audit all settings, ensure production values are injected via env vars, no defaults for secrets.
- [ ] **Backup strategy** — SQLite file in a Docker volume. PostgreSQL needs pg_dump schedule or WAL archiving. Define RPO/RTO.

---

*Last updated: 2026-04-07 — Phase 4A planning*
