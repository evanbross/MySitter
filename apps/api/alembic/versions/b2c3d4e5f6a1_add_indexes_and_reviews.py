"""add_indexes_and_reviews

Revision ID: b2c3d4e5f6a1
Revises: a1b2c3d4e5f6
Create Date: 2026-04-12 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'b2c3d4e5f6a1'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add status index to bookings
    op.create_index(op.f('ix_bookings_status'), 'bookings', ['status'], unique=False)

    # Reviews table already added in Phase 2 schema conceptually, but let's make sure the rating check is there
    # since it wasn't in 2dbf03f00291_initial_schema.py.
    # Actually wait, initial schema *did* create reviews table without the check constraint but with the columns.
    # Let's check initial schema:
    #     op.create_table('reviews',
    #     sa.Column('id', sa.UUID(), nullable=False),
    #     sa.Column('booking_id', sa.UUID(), nullable=False),
    #     sa.Column('reviewer_id', sa.UUID(), nullable=False),
    #     sa.Column('reviewee_id', sa.UUID(), nullable=False),
    #     sa.Column('rating', sa.Integer(), nullable=False),
    #     sa.Column('body', sa.Text(), nullable=True),
    #     sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    #     sa.ForeignKeyConstraint(['booking_id'], ['bookings.id'], ondelete='CASCADE'),
    #     sa.ForeignKeyConstraint(['reviewee_id'], ['users.id'], ondelete='CASCADE'),
    #     sa.ForeignKeyConstraint(['reviewer_id'], ['users.id'], ondelete='CASCADE'),
    #     sa.PrimaryKeyConstraint('id'),
    #     sa.UniqueConstraint('booking_id'),
    #     sa.UniqueConstraint('booking_id', name='uq_review_booking')
    #     )
    
    # We changed the review constraints in Phase 3.
    # We drop the old unique constraint and add the new ones
    op.execute("ALTER TABLE reviews DROP CONSTRAINT IF EXISTS uq_review_booking")
    op.execute("ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_booking_id_key")
    
    op.create_unique_constraint('uq_review_per_booking_reviewer', 'reviews', ['booking_id', 'reviewer_id'])
    
    # Add the check constraint
    op.execute("ALTER TABLE reviews ADD CONSTRAINT chk_review_rating_range CHECK (rating >= 1 AND rating <= 5)")

    op.create_index(op.f('ix_reviews_booking_id'), 'reviews', ['booking_id'], unique=False)

def downgrade() -> None:
    op.drop_index(op.f('ix_reviews_booking_id'), table_name='reviews')
    op.execute("ALTER TABLE reviews DROP CONSTRAINT chk_review_rating_range")
    op.drop_constraint('uq_review_per_booking_reviewer', 'reviews', type_='unique')
    op.create_unique_constraint('uq_review_booking', 'reviews', ['booking_id'])
    op.drop_index(op.f('ix_bookings_status'), table_name='bookings')
