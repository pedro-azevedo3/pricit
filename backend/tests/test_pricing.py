from decimal import Decimal as D
from types import SimpleNamespace
import pytest
from app.pricing import grams, cost_per_gram, calculate_recipe, calculate_simulation, margin

def test_kg_conversion():
    assert grams(D('1.25'),'kg') == D('1250')
    assert grams(D('200'),'g') == D('200')

@pytest.mark.parametrize('unit,quantity', [('g','1000'),('kg','1')])
def test_ingredient_cost(unit,quantity):
    ingredient=SimpleNamespace(package_price=D('40'),package_quantity=D(quantity),measurement_unit=unit)
    assert cost_per_gram(ingredient) == D('0.04')
    assert grams(D('0.2'),'kg')*cost_per_gram(ingredient) == D('8')

def test_all_recipe_costs():
    recipe=SimpleNamespace(packaging_unit_cost=D('0.5'),packaging_quantity=12,operational_expense_percentage=D('10'),hourly_labor_cost=D('20'),production_time_minutes=90,yield_quantity=12,desired_markup_percentage=D('50'),selling_price=D('8'))
    p=calculate_recipe(recipe,D('15.1'))
    assert p['ingredients_cost']==D('15.1')
    assert p['packaging_cost']==D('6')
    assert p['operational_cost']==D('2.11')
    assert p['labor_cost']==D('30')
    assert p['total_cost']==D('53.21')
    assert p['unit_cost']==D('53.21')/12
    assert abs(p['suggested_price']-p['unit_cost']*D('1.5'))<D('1e-40')
    assert p['effective_profit']==D('8')-p['unit_cost']
    assert p['effective_margin']==(D('8')-p['unit_cost'])/8*100

@pytest.mark.parametrize('price', ['8','0'])
def test_simulation_and_whole_batches(price):
    s=calculate_simulation({'yield_quantity':12,'pricing':{'unit_cost':'5','total_cost':'60','effective_price':price}},100)
    assert s['production_cost']==500
    assert s['revenue']==D(price)*100
    assert s['profit']==s['revenue']-500
    assert s['batches']==9 and s['surplus']==8
    assert s['batch_cost']==540 and s['batch_profit']==s['revenue']-540
    assert s['margin']==(D('37.5') if price=='8' else 0)

def test_zero_margin_and_precision():
    assert margin(D(0),D(0))==0
    ingredient=SimpleNamespace(package_price=D('1'),package_quantity=D('3000'),measurement_unit='g')
    assert abs(cost_per_gram(ingredient)*D('3000')-1)<D('1e-40')
