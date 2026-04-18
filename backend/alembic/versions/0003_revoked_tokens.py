"""revoked_tokens: server-side JWT revocation list

Revision ID: 0003_revoked_tokens
Revises: 0002_simulations
Create Date: 2026-04-18 00:00:02
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0003_revoked_tokens"
down_revision: str | Sequence[str] | None = "0002_simulations"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "revoked_tokens",
        sa.Column("jti", sa.String(length=64), primary_key=True),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "revoked_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_revoked_tokens_user_id", "revoked_tokens", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_revoked_tokens_user_id", table_name="revoked_tokens")
    op.drop_table("revoked_tokens")
