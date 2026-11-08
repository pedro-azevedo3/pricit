"""Encrypt existing business fields atomically, preserving IDs and relationships."""
from alembic import op
import sqlalchemy as sa
from app.encryption import FIELDS, keyring, seal

revision = 'e739a2d1b401'
down_revision = 'c28d1e9f040a'
branch_labels = None
depends_on = None


def upgrade():
    keyring()  # Fail before any DDL if the keys are unavailable.
    connection = op.get_bind()
    for table, fields in FIELDS.items():
        inspector = sa.inspect(connection)
        nullable = {c['name']: c['nullable'] for c in inspector.get_columns(table)}
        # Numeric/unit rules are now checked by Pydantic and EncryptedField before encryption.
        for constraint in inspector.get_check_constraints(table):
            op.drop_constraint(constraint['name'], table, type_='check')
        for column in fields:
            op.add_column(table, sa.Column('_encrypted_' + column, sa.Text(), nullable=True))
        columns = ', '.join('"' + column + '"' for column in fields)
        statement = sa.text(f'SELECT id, {columns} FROM "{table}"')
        updates = ', '.join(f'"_encrypted_{column}" = :{column}' for column in fields)
        result = connection.execution_options(stream_results=True).execute(statement)
        try:
            for batch in result.mappings().partitions(200):
                encrypted_rows = [dict(id=row['id'], **{column: seal(row[column], f'{table}.{column}', kind)
                                  for column, kind in fields.items()}) for row in batch]
                # Use a non-streaming cursor for UPDATE while the read cursor is open.
                connection.execution_options(stream_results=False).execute(sa.text(f'UPDATE "{table}" SET {updates} WHERE id = :id'), encrypted_rows)
        finally:
            result.close()
            connection.execution_options(stream_results=False)
        for column in fields:
            op.drop_column(table, column)
            op.alter_column(table, '_encrypted_' + column, new_column_name=column, nullable=nullable[column])


def downgrade():
    # Avoid an accidental command turning all customer data into plaintext.
    raise RuntimeError('Encryption downgrade requires an explicitly planned restore from an encrypted backup')
