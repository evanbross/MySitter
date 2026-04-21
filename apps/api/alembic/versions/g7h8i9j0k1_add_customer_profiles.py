"""add customer profiles

Revision ID: g7h8i9j0k1
Revises: f6a7b8c9d0
Create Date: 2026-04-19 00:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "g7h8i9j0k1"
down_revision: Union[str, None] = "f6a7b8c9d0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "customer_profiles",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("home_description", sa.Text(), nullable=True),
        sa.Column("home_type", sa.String(length=50), nullable=True),
        sa.Column("has_yard", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("pet_names", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default="[]"),
        sa.Column("pet_types", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default="[]"),
        sa.Column("pet_description", sa.Text(), nullable=True),
        sa.Column("special_instructions", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id"),
    )
    op.create_index("ix_customer_profiles_user_id", "customer_profiles", ["user_id"])

    # Backfill: create a blank profile for any CUSTOMER users who registered before this migration.
    op.execute("""
        INSERT INTO customer_profiles (id, user_id, has_yard, pet_names, pet_types)
        SELECT gen_random_uuid(), id, false, '[]'::jsonb, '[]'::jsonb
        FROM users
        WHERE role = 'CUSTOMER'
        ON CONFLICT (user_id) DO NOTHING
    """)


def downgrade() -> None:
    op.drop_index("ix_customer_profiles_user_id", table_name="customer_profiles")
    op.drop_table("customer_profiles")
