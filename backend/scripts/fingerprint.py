"""Compare logical data across encryption migration without printing customer values."""
from datetime import datetime
from decimal import Decimal
import hashlib
import json
import uuid
from sqlalchemy import text
from app.database import engine
from app.encryption import FIELDS, unseal


def default(value):
    if isinstance(value, (Decimal, uuid.UUID, datetime)):
        return str(value)
    raise TypeError()

result = {}
with engine.connect() as connection:
    for table, fields in FIELDS.items():
        rows = []
        for row in connection.execute(text(f'SELECT * FROM "{table}" ORDER BY id')).mappings():
            record = dict(row)
            for field, kind in fields.items():
                value = record[field]
                if isinstance(value, str) and value.startswith('enc:v1:'):
                    record[field] = unseal(value, f'{table}.{field}', kind)
            rows.append(record)
        digest = hashlib.sha256(json.dumps(rows, default=default, sort_keys=True, ensure_ascii=False).encode()).hexdigest()
        result[table] = {'count': len(rows), 'sha256': digest}
print(json.dumps(result, sort_keys=True))
