"""Baseline — stamp existing schema. No-op migration.

Revision ID: 0001
Revises: None
Create Date: 2026-04-10
"""
from typing import Sequence, Union

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Existing tables are created by Base.metadata.create_all.
    This migration exists to establish a baseline for Alembic history.
    Future migrations build on this revision."""
    pass


def downgrade() -> None:
    pass
