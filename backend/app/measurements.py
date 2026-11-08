"""Ingredient dimensions: mass, volume, and count must never be mixed."""
from decimal import Decimal
from typing import Literal

MeasurementUnit = Literal['g', 'kg', 'ml', 'un']
BASE_UNITS = {'g': 'g', 'kg': 'g', 'ml': 'ml', 'un': 'un'}


def base_unit(unit):
    return BASE_UNITS[unit]


def base_quantity(quantity, unit):
    base_unit(unit)  # Reject unknown units instead of silently treating them as grams.
    return quantity * (Decimal(1000) if unit == 'kg' else Decimal(1))
