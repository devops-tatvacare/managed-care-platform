"""Add search_index table with full-text and trigram indexes.

Revision ID: 0002
Revises: 0001
Create Date: 2026-04-10
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")

    op.create_table(
        "search_index",
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("tenant_id", sa.UUID(), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("entity_type", sa.String(30), nullable=False),
        sa.Column("entity_id", sa.UUID(), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("subtitle", sa.Text(), nullable=True),
        sa.Column("metadata", JSONB, server_default=sa.text("'{}'::jsonb"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # Add computed tsvector column via raw SQL (Alembic doesn't support GENERATED ALWAYS AS for tsvector)
    op.execute("""
        ALTER TABLE search_index ADD COLUMN search_vector tsvector
        GENERATED ALWAYS AS (
            setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
            setweight(to_tsvector('simple', coalesce(subtitle, '')), 'B')
        ) STORED
    """)

    op.execute("""
        ALTER TABLE search_index ADD COLUMN search_text text
        GENERATED ALWAYS AS (
            coalesce(title, '') || ' ' || coalesce(subtitle, '')
        ) STORED
    """)

    # Indexes
    op.create_index("ix_search_idx_tenant", "search_index", ["tenant_id"])
    op.create_index("ix_search_idx_type", "search_index", ["entity_type"])
    op.create_unique_constraint("uq_search_entity", "search_index", ["entity_type", "entity_id"])

    # GIN indexes via raw SQL
    op.execute("CREATE INDEX ix_search_idx_vector ON search_index USING gin(search_vector)")
    op.execute("CREATE INDEX ix_search_idx_trgm ON search_index USING gin(search_text gin_trgm_ops)")


def downgrade() -> None:
    op.drop_table("search_index")
    op.execute("DROP EXTENSION IF EXISTS pg_trgm")
