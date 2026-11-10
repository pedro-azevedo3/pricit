"""Private, encrypted quotes and contracts owned by an account."""
from alembic import op
import sqlalchemy as sa

revision = 'e62c8d7b314f'
down_revision = 'd51b7c6a203e'
branch_labels = None
depends_on = None

def upgrade():
    op.create_table('business_documents',
        sa.Column('id', sa.Uuid(), primary_key=True),
        sa.Column('owner_id', sa.Uuid(), sa.ForeignKey('users.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('payload', sa.Text(), nullable=False))
    op.create_index('ix_business_documents_owner_id', 'business_documents', ['owner_id'])

def downgrade():
    raise RuntimeError('Downgrade would discard customer documents. Use a reviewed recovery plan.')
