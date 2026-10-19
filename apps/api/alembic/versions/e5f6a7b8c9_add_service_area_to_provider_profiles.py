# =============================================================================
# Copyright (c) 2026 ZombieTech LLC. All rights reserved.
#
# SPDX-License-Identifier: PolyForm-Strict-1.0.0
# See LICENSE in the project root for the full terms.
#
# Licensing inquiries: license@zombietech.biz
# =============================================================================

"""add_service_area_to_provider_profiles

Revision ID: e5f6a7b8c9
Revises: d4e5f6a7b3
Create Date: 2026-04-15 12:00:00.000000
"""
from typing import Sequence, Union
import sqlalchemy as sa
from geoalchemy2 import Geography
from alembic import op

revision: str = "e5f6a7b8c9"
down_revision: Union[str, None] = "d4e5f6a7b3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "provider_profiles",
        sa.Column(
            "service_area",
            Geography(geometry_type="POLYGON", srid=4326),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column("provider_profiles", "service_area")
