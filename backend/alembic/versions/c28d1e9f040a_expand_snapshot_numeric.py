"""Preserve calculated decimal values without forcing a fixed scale."""
from alembic import op
import sqlalchemy as sa
revision = 'c28d1e9f040a'
down_revision = 'b167e017b7f6'
branch_labels = None
depends_on = None
COLUMNS = ['unit_cost_snapshot', 'revenue_snapshot', 'production_cost_snapshot', 'profit_snapshot', 'margin_snapshot']

def upgrade():
    op.alter_column('revenue_simulations', 'selling_price', type_=sa.Numeric(), existing_type=sa.Numeric(24, 6))
    for column in COLUMNS:
        op.alter_column('revenue_simulations', column, type_=sa.Numeric(), existing_type=sa.Numeric(38, 18))

def downgrade():
    op.alter_column('revenue_simulations', 'selling_price', type_=sa.Numeric(24, 6), existing_type=sa.Numeric())
    for column in COLUMNS:
        op.alter_column('revenue_simulations', column, type_=sa.Numeric(38, 18), existing_type=sa.Numeric())
