"""Business perspectives and explicit energy/equipment costs, preserving existing records."""
from alembic import op
import sqlalchemy as sa

revision = 'd51b7c6a203e'
down_revision = 'a82f30b4d9e1'
branch_labels = None
depends_on = None

def upgrade():
    op.add_column('users', sa.Column('business_name', sa.Text(), nullable=True))
    op.add_column('users', sa.Column('business_type', sa.String(24), nullable=False, server_default='food'))
    op.add_column('users', sa.Column('pricing_goal', sa.String(32), nullable=False, server_default='understand_costs'))
    op.add_column('recipes', sa.Column('kind', sa.String(16), nullable=False, server_default='recipe'))
    # NULL denotes no extra costs on legacy recipes; populated lists are encrypted by the app.
    op.add_column('recipes', sa.Column('additional_costs', sa.Text(), nullable=True))

def downgrade():
    raise RuntimeError('Downgrade would discard business profiles and cost breakdowns. Use a reviewed recovery plan.')
