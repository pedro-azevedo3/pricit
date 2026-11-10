"""Compare logical data across encryption migration without printing customer values."""
from datetime import datetime
from decimal import Decimal
import hashlib
import json
import uuid
from sqlalchemy import text, inspect
from app.database import engine
from app.encryption import FIELDS, unseal


def default(value):
    if isinstance(value, (Decimal, uuid.UUID, datetime)):
        return str(value)
    raise TypeError()

result = {}
with engine.connect() as connection:
    inspector = inspect(connection)
    tables = set(inspector.get_table_names())
    for table, fields in FIELDS.items():
        # Restoring an older backup must not require columns/tables added later.
        if table not in tables:
            continue
        columns = {column['name'] for column in inspector.get_columns(table)}
        existing_fields = {field: kind for field, kind in fields.items() if field in columns}
        if not existing_fields:
            continue
        rows = []
        for row in connection.execute(text(f'SELECT * FROM "{table}" ORDER BY id')).mappings():
            record = dict(row)
            for field, kind in existing_fields.items():
                value = record[field]
                if isinstance(value, str) and value.startswith('enc:v1:'):
                    record[field] = unseal(value, f'{table}.{field}', kind)
            rows.append(record)
        digest = hashlib.sha256(json.dumps(rows, default=default, sort_keys=True, ensure_ascii=False).encode()).hexdigest()
        result[table] = {'count': len(rows), 'sha256': digest}
print(json.dumps(result, sort_keys=True))
