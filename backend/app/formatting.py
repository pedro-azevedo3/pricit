"""Presentation rounding only: preserve original values for all calculations."""
from decimal import Decimal, ROUND_HALF_UP


def display_decimal(value):
    number = Decimal(str(value))
    # Test the original hundredth digit: values below x.x7 keep normal cent rounding.
    magnitude = abs(number)
    remainder = magnitude % Decimal('0.10')
    if remainder >= Decimal('0.07'):
        magnitude = magnitude - remainder + Decimal('0.10')
        number = -magnitude if number < 0 else magnitude
    rounded = number.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    return abs(rounded) if rounded == 0 else rounded


def decimal_text(value):
    return f'{display_decimal(value):,.2f}'.replace(',', '_').replace('.', ',').replace('_', '.')


def money(value):
    return 'R$ ' + decimal_text(value)


def percentage(value):
    return decimal_text(value) + '%'
