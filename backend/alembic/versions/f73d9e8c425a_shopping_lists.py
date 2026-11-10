"""Private shopping lists with encrypted reference snapshots."""
from alembic import op
import sqlalchemy as sa

revision = 'f73d9e8c425a'
down_revision = 'e62c8d7b314f'
branch_labels = None
depends_on = None

def upgrade():
    op.create_table('shopping_lists',
        sa.Column('id',sa.Uuid(),primary_key=True),
        sa.Column('owner_id',sa.Uuid(),sa.ForeignKey('users.id',ondelete='RESTRICT'),nullable=False),
        sa.Column('created_at',sa.DateTime(timezone=True),nullable=False),
        sa.Column('updated_at',sa.DateTime(timezone=True),nullable=False),
        sa.Column('payload',sa.Text(),nullable=False))
    op.create_index('ix_shopping_lists_owner_id','shopping_lists',['owner_id'])

def downgrade():
    raise RuntimeError('Downgrade would discard shopping lists. Use a reviewed recovery plan.')
