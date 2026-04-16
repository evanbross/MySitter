"""add_referrals

Revision ID: f6a7b8c9d0
Revises: e5f6a7b8c9
Create Date: 2026-04-15 13:00:00.000000
"""
from typing import Sequence, Union
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql as pg
from alembic import op

revision: str = "f6a7b8c9d0"
down_revision: Union[str, None] = "e5f6a7b8c9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "referrals",
        sa.Column("id", pg.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "referrer_id",
            pg.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "referred_id",
            pg.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("code", sa.String(16), unique=True, nullable=False),
        sa.Column(
            "status",
            sa.Enum("PENDING", "CLAIMED", "REWARDED", name="referralstatus"),
            nullable=False,
            server_default="PENDING",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
        sa.Column("claimed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("rewarded_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_referrals_referrer_id", "referrals", ["referrer_id"])
    op.create_index("ix_referrals_code", "referrals", ["code"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_referrals_code", table_name="referrals")
    op.drop_index("ix_referrals_referrer_id", table_name="referrals")
    op.drop_table("referrals")
    op.execute("DROP TYPE IF EXISTS referralstatus")
