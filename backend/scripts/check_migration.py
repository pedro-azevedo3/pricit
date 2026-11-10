"""Exercise old-schema migration and the API suite in a disposable database only."""
import os
import subprocess
import sys
import uuid
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.engine import make_url


def child():
    from alembic.config import Config
    from alembic import command
    from app.database import engine
    from app.encryption import LEGACY_FIELDS as FIELDS, unseal
    from datetime import datetime, timezone
    from decimal import Decimal
    import json
    config = Config('alembic.ini')
    command.upgrade(config, 'c28d1e9f040a')
    old_fingerprint = json.loads(subprocess.check_output([sys.executable, '-m', 'scripts.fingerprint']))
    assert {'business_documents','shopping_lists'}.isdisjoint(old_fingerprint)
    ids = {table: uuid.uuid4() for table in FIELDS}
    values = {}
    with engine.begin() as connection:
        for table, fields in FIELDS.items():
            record = {'id': ids[table], 'created_at': datetime.now(timezone.utc)}
            if table in ('ingredients', 'recipes'):
                record['updated_at'] = datetime.now(timezone.utc)
            if table in ('recipe_ingredients','revenue_simulations'):
                record['recipe_id'] = ids['recipes']
            if table == 'recipe_ingredients':
                record['ingredient_id'] = ids['ingredients']
            for column, kind in fields.items():
                value = {'name':'Migração secreta 🍰', 'unit':'g', 'text':'Descrição confidencial', 'bool':True,
                         'json':{'receita':'Segredo','decimal':'0.123456789012345678901234567890'},
                         'positive_int':2,'nonnegative_int':1}.get(kind, Decimal('0.123456'))
                if table == 'revenue_simulations' and kind == 'decimal':
                    value = Decimal('0.123456789012345678901234567890')
                if table == 'recipes' and column == 'selling_price':
                    value = None
                record[column] = json.dumps(value) if kind == 'json' else value
            columns = ','.join('"'+column+'"' for column in record)
            params = ','.join(':'+column for column in record)
            connection.execute(text(f'INSERT INTO "{table}" ({columns}) VALUES ({params})'), record)
        # Compare to stored legacy values so historical Numeric precision is respected.
        for table in FIELDS:
            values[table] = dict(connection.execute(text(f'SELECT * FROM "{table}"')).mappings().one())
    command.upgrade(config, 'head')
    new_fingerprint = json.loads(subprocess.check_output([sys.executable, '-m', 'scripts.fingerprint']))
    assert {'business_documents','shopping_lists'}.issubset(new_fingerprint)
    with engine.begin() as connection:
        legacy_recipe = connection.execute(text('SELECT kind, additional_costs FROM recipes')).mappings().one()
        assert legacy_recipe['kind'] == 'recipe' and legacy_recipe['additional_costs'] is None
        assert {c['name'] for c in inspect(connection).get_columns('users')} >= {'business_name','business_type','pricing_goal'}
        for table, fields in FIELDS.items():
            row = connection.execute(text(f'SELECT * FROM "{table}"')).mappings().one()
            for field, kind in fields.items():
                assert row[field] is None or row[field].startswith('enc:v1:')
                assert unseal(row[field], f'{table}.{field}', kind) == values[table][field]
            assert row['id'] == values[table]['id']
        for table in reversed(FIELDS):
            connection.execute(text(f'DELETE FROM "{table}"'))
    print('Legacy migration preserved all fields, decimal precision, NULLs and IDs; raw values encrypted.')
    engine.dispose()
    return subprocess.call([sys.executable,'-m','pytest','-q','tests'])


def main():
    if '--child' in sys.argv:
        return child()
    url = make_url(os.environ['DATABASE_URL'])
    database = 'privacy_check_' + uuid.uuid4().hex
    admin = create_engine(url, isolation_level='AUTOCOMMIT', hide_parameters=True)
    with admin.connect() as connection:
        connection.execute(text(f'CREATE DATABASE "{database}"'))
    try:
        env = {**os.environ, 'DATABASE_URL': url.set(database=database).render_as_string(hide_password=False)}
        return subprocess.call([sys.executable,'-m','scripts.check_migration','--child'], env=env)
    finally:
        with admin.connect() as connection:
            connection.execute(text(f'DROP DATABASE "{database}" WITH (FORCE)'))
        admin.dispose()

if __name__ == '__main__':
    sys.exit(main())
