from decimal import Decimal
import pytest
from app.formatting import display_decimal, decimal_text, money, percentage
from app.pdf import money as pdf_money

@pytest.mark.parametrize('source,expected', [
    ('5.26','5.26'), ('5.269','5.27'), ('5.27','5.30'), ('5.28','5.30'),
    ('5.29','5.30'), ('5.30','5.30'), ('5.97','6.00'), ('9.99','10.00'),
    ('0','0.00'), ('0.004','0.00'), ('0.006','0.01'), ('0.07','0.10'),
    ('-5.27','-5.30'), ('-0.001','0.00'), ('1234.57','1234.60'),
])
def test_display_rounding(source, expected):
    original = Decimal(source)
    assert display_decimal(original) == Decimal(expected)
    assert original == Decimal(source)  # Formatting must not mutate the source.
    assert display_decimal(original).as_tuple().exponent == -2


def test_brazilian_format_in_pdf_and_ui_contract():
    assert money('1234.57') == 'R$ 1.234,60'
    assert pdf_money('5.27') == 'R$ 5,30'
    assert decimal_text('2.27') == '2,30'
    assert percentage('37.5789') == '37,60%'
    assert money('0.004') == 'R$ 0,00'
