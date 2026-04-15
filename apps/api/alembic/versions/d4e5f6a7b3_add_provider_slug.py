"""add_provider_slug

Revision ID: d4e5f6a7b3
Revises: c3d4e5f6a7b2
Create Date: 2026-04-15 11:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "d4e5f6a7b3"
down_revision: Union[str, None] = "c3d4e5f6a7b2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "provider_profiles",
        sa.Column("slug", sa.String(100), nullable=True),
    )

    # Backfill: slugify display_name + append first 8 chars of the profile UUID
    # for uniqueness when two providers share the same name.
    op.execute("""
        UPDATE provider_profiles pp
        SET slug =
            trim('-' FROM regexp_replace(lower(u.display_name), '[^a-z0-9]+', '-', 'g'))
            || '-' || left(pp.id::text, 8)
        FROM users u
        WHERE pp.user_id = u.id
    """)

    op.create_index("ix_provider_profiles_slug", "provider_profiles", ["slug"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_provider_profiles_slug", table_name="provider_profiles")
    op.drop_column("provider_profiles", "slug")
