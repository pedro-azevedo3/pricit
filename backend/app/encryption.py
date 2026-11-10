"""Authenticated field encryption. Database/backup access alone cannot reveal values."""
import base64
from decimal import Decimal
from functools import lru_cache
import json
import os
from pathlib import Path
import re

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from .measurements import BASE_UNITS
from sqlalchemy import Text
from sqlalchemy.types import TypeDecorator

# This schema also defines the migration; identifiers are application constants, never input.
FIELDS = {
    'ingredients': {'name': 'name', 'measurement_unit': 'unit', 'package_quantity': 'positive_decimal', 'package_price': 'nonnegative_decimal', 'is_active': 'bool'},
    'recipes': {'name': 'name', 'description': 'text', 'yield_quantity': 'positive_int', 'production_time_minutes': 'nonnegative_int',
                'packaging_unit_cost': 'nonnegative_decimal', 'packaging_quantity': 'nonnegative_int', 'operational_expense_percentage': 'nonnegative_decimal',
                'hourly_labor_cost': 'nonnegative_decimal', 'desired_markup_percentage': 'nonnegative_decimal', 'selling_price': 'nonnegative_decimal'},
    'recipe_ingredients': {'quantity_used': 'positive_decimal', 'measurement_unit': 'unit'},
    'revenue_simulations': {'quantity_sold': 'positive_int', 'selling_price': 'nonnegative_decimal', 'unit_cost_snapshot': 'decimal',
                            'revenue_snapshot': 'decimal', 'production_cost_snapshot': 'decimal', 'profit_snapshot': 'decimal',
                            'margin_snapshot': 'decimal', 'recipe_snapshot': 'json'},
}
# The original encryption migration must never depend on fields added by later migrations.
LEGACY_FIELDS = FIELDS
FIELDS = {**LEGACY_FIELDS, 'users': {'business_name': 'name'},
          'recipes': {**LEGACY_FIELDS['recipes'], 'additional_costs': 'json'},
          'business_documents': {'payload': 'json'}}

@lru_cache(maxsize=1)
def keyring():
    try:
        contents = os.environ.get('DATA_KEYS_JSON')
        if contents is None:
            contents = Path(os.environ.get('DATA_KEYS_FILE', '/run/secrets/data_keys')).read_text()
        data = json.loads(contents)
        active = data['active']
        keys = {kid: base64.b64decode(value, validate=True) for kid, value in data['keys'].items()}
        if active not in keys or any(not re.fullmatch(r'[a-zA-Z0-9_-]{1,40}', k) or len(v) != 32 for k,v in keys.items()):
            raise ValueError()
        return active, keys
    except Exception:
        raise RuntimeError('Data encryption keys unavailable or invalid') from None


def encode_value(value, kind):
    if 'decimal' in kind:
        value = Decimal(str(value))
        if not value.is_finite() or ('positive' in kind and value <= 0) or ('nonnegative' in kind and value < 0):
            raise ValueError('Invalid numeric field')
        return str(value)
    if kind.endswith('int'):
        if not isinstance(value, int) or isinstance(value, bool) or ('positive' in kind and value <= 0) or ('nonnegative' in kind and value < 0):
            raise ValueError('Invalid integer field')
    if kind == 'bool' and not isinstance(value, bool):
        raise ValueError('Invalid boolean field')
    if kind == 'unit' and value not in BASE_UNITS:
        raise ValueError('Invalid unit field')
    if kind == 'name' and (not isinstance(value, str) or not 1 <= len(value) <= 200):
        raise ValueError('Invalid name field')
    return value


def seal(value, context, kind):
    if value is None:
        return None
    active, keys = keyring()
    payload = json.dumps(encode_value(value, kind), ensure_ascii=False, separators=(',', ':')).encode()
    nonce = os.urandom(12)
    aad = f'pricit/data/v1/{active}/{context}'.encode()
    data = AESGCM(keys[active]).encrypt(nonce, payload, aad)
    return f'enc:v1:{active}:' + base64.b64encode(nonce + data).decode()


def unseal(value, context, kind):
    if value is None:
        return None
    try:
        prefix, version, kid, encoded = value.split(':', 3)
        if prefix != 'enc' or version != 'v1':
            raise ValueError()
        _, keys = keyring()
        data = base64.b64decode(encoded, validate=True)
        aad = f'pricit/data/v1/{kid}/{context}'.encode()
        payload = AESGCM(keys[kid]).decrypt(data[:12], data[12:], aad)
        result = json.loads(payload)
        return Decimal(result) if 'decimal' in kind else result
    except Exception:
        # Never include ciphertext, plaintext, or key material in an exception.
        raise ValueError('Encrypted field cannot be read') from None


class EncryptedField(TypeDecorator):
    impl = Text
    cache_ok = True

    def __init__(self, context, kind):
        super().__init__()
        self.context = context
        self.kind = kind

    def process_bind_param(self, value, dialect):
        return seal(value, self.context, self.kind)

    def process_result_value(self, value, dialect):
        return unseal(value, self.context, self.kind)


def encrypted(table, column):
    return EncryptedField(f'{table}.{column}', FIELDS[table][column])
