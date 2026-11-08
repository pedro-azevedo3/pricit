"""Isolate business records by account; preserve legacy rows without inventing owners."""
from alembic import op
import sqlalchemy as sa

revision = 'a82f30b4d9e1'
down_revision = 'f84b0273a021'
branch_labels = None
depends_on = None


def upgrade():
    for table in ('ingredients', 'recipes', 'revenue_simulations'):
        # Existing rows stay NULL and are inaccessible through the authenticated API.
        # They must be reviewed and assigned explicitly by an administrator.
        op.add_column(table, sa.Column('owner_id', sa.Uuid(), nullable=True))
        op.create_foreign_key(f'fk_{table}_owner_id', table, 'users', ['owner_id'], ['id'], ondelete='RESTRICT')
        op.create_index(f'ix_{table}_owner_id', table, ['owner_id'])


def downgrade():
    raise RuntimeError('Removing account ownership would expose private records. Restore through a reviewed recovery plan.')
