"""Add search_index table with full-text and trigram indexes.

Revision ID: 0002
Revises: 0001
Create Date: 2026-04-10
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")

    # Use raw SQL with IF NOT EXISTS — create_all may have already created the table
    op.execute(sa.text("""
        CREATE TABLE IF NOT EXISTS search_index (
            id UUID DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
            tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            entity_type VARCHAR(30) NOT NULL,
            entity_id UUID NOT NULL,
            title TEXT NOT NULL,
            subtitle TEXT,
            metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
        )
    """))

    # Add computed columns if they don't exist (create_all adds them, but guard anyway)
    op.execute("""
        DO $$ BEGIN
            ALTER TABLE search_index ADD COLUMN search_vector tsvector
            GENERATED ALWAYS AS (
                setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
                setweight(to_tsvector('simple', coalesce(subtitle, '')), 'B')
            ) STORED;
        EXCEPTION WHEN duplicate_column THEN NULL;
        END $$
    """)

    op.execute("""
        DO $$ BEGIN
            ALTER TABLE search_index ADD COLUMN search_text text
            GENERATED ALWAYS AS (
                coalesce(title, '') || ' ' || coalesce(subtitle, '')
            ) STORED;
        EXCEPTION WHEN duplicate_column THEN NULL;
        END $$
    """)

    # Indexes (IF NOT EXISTS for idempotency when create_all ran first)
    op.execute("CREATE INDEX IF NOT EXISTS ix_search_idx_tenant ON search_index (tenant_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_search_idx_type ON search_index (entity_type)")
    op.execute("""
        DO $$ BEGIN
            ALTER TABLE search_index ADD CONSTRAINT uq_search_entity UNIQUE (entity_type, entity_id);
        EXCEPTION WHEN duplicate_table THEN NULL;
        END $$
    """)

    # GIN indexes
    op.execute("CREATE INDEX IF NOT EXISTS ix_search_idx_vector ON search_index USING gin(search_vector)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_search_idx_trgm ON search_index USING gin(search_text gin_trgm_ops)")


def downgrade() -> None:
    op.drop_table("search_index")
    op.execute("DROP EXTENSION IF EXISTS pg_trgm")
