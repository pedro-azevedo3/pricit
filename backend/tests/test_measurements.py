from decimal import Decimal as D
from types import SimpleNamespace
import pytest
from app.measurements import base_quantity, base_unit
from app.pricing import cost_per_base_unit, cost_per_gram


@pytest.mark.parametrize('unit,quantity,price,used,expected', [
    ('g','1000','20','100','2'), ('kg','1','20','100','2'),
    ('ml','1000','8','250','2'), ('un','12','18','2','3'), ('un','1','1.50','.5','.75'),
])
def test_cost_by_dimension(unit, quantity, price, used, expected):
    ingredient = SimpleNamespace(measurement_unit=unit, package_quantity=D(quantity), package_price=D(price))
    assert base_quantity(D(used), base_unit(unit)) * cost_per_base_unit(ingredient) == D(expected)
    if unit in ('ml', 'un'):
        with pytest.raises(ValueError):
            cost_per_gram(ingredient)


def ingredient(client, unit, quantity, price):
    response = client.post('/api/v1/ingredients', json={'name':f'Ingrediente {unit}', 'measurement_unit':unit,
                                                       'package_quantity':quantity, 'package_price':price})
    assert response.status_code == 201, response.text
    return response.json()


def recipe(items):
    return {'name':'Receita com medidas variadas', 'yield_quantity':4, 'packaging_quantity':0, 'ingredients':items}


def test_mixed_recipe_costs_edit_duplicate_history_and_pdf(client):
    flour = ingredient(client, 'kg', '1', '20')
    milk = ingredient(client, 'ml', '1000', '8')
    eggs = ingredient(client, 'un', '12', '18')
    assert milk['base_unit'] == 'ml' and D(milk['cost_per_base_unit']) == D('.008')
    assert milk['cost_per_gram'] is None and milk['cost_per_kg'] is None
    assert eggs['base_unit'] == 'un' and D(eggs['cost_per_base_unit']) == D('1.5')
    data = recipe([{'ingredient_id':i['id'],'measurement_unit':unit,'quantity_used':quantity}
                   for i, unit, quantity in [(flour,'g','100'), (milk,'ml','250'), (eggs,'un','2')]])
    response = client.post('/api/v1/recipes', json=data)
    assert response.status_code == 201, response.text
    saved = response.json()
    assert [D(i['cost']) for i in saved['ingredients']] == [D('2'),D('2'),D('3')]
    assert D(saved['pricing']['total_cost']) == 7
    assert D(saved['pricing']['unit_cost']) == D('1.75')
    assert client.post(f"/api/v1/recipes/{saved['id']}/duplicate").status_code == 201
    simulation = client.post('/api/v1/simulations',json={'recipe_id':saved['id'],'quantity_sold':8}).json()
    patch = {k:eggs[k] for k in ('name','measurement_unit','package_quantity','package_price')}
    patch['package_price'] = '24'
    assert client.put('/api/v1/ingredients/'+eggs['id'],json=patch).status_code == 200
    assert D(client.get('/api/v1/recipes/'+saved['id']).json()['pricing']['total_cost']) == 8
    assert client.get('/api/v1/simulations/'+simulation['id']).json() == simulation
    for path in [f"recipes/{saved['id']}/pdf",f"simulations/{simulation['id']}/pdf"]:
        pdf = client.get('/api/v1/'+path)
        assert pdf.status_code == 200 and pdf.content.startswith(b'%PDF-')


@pytest.mark.parametrize('stored,used', [('ml','g'),('ml','kg'),('ml','un'),('un','ml'),('un','g'),('g','ml'),('g','un')])
def test_recipe_rejects_incompatible_measures(client, stored, used):
    obj = ingredient(client, stored, '12', '18')
    response = client.post('/api/v1/recipes', json=recipe([{'ingredient_id':obj['id'], 'measurement_unit':used, 'quantity_used':'1'}]))
    assert response.status_code == 422
    assert 'incompatível' in response.json()['detail']


def test_linked_ingredient_cannot_change_dimension(client):
    obj = ingredient(client, 'un','12','18')
    saved = client.post('/api/v1/recipes',json=recipe([{'ingredient_id':obj['id'],'measurement_unit':'un','quantity_used':'2'}])).json()
    patch = {k:obj[k] for k in ('name','measurement_unit','package_quantity','package_price')}
    patch['measurement_unit'] = 'ml'
    assert client.put('/api/v1/ingredients/'+obj['id'],json=patch).status_code == 409
    assert client.get('/api/v1/ingredients/'+obj['id']).json()['measurement_unit'] == 'un'
    assert D(client.get('/api/v1/recipes/'+saved['id']).json()['pricing']['ingredients_cost']) == 3
    assert client.delete('/api/v1/recipes/'+saved['id']).status_code == 204
    assert client.put('/api/v1/ingredients/'+obj['id'],json=patch).status_code == 200


def test_historical_mass_snapshot_without_new_fields_still_reads_and_exports(client, recipe_data):
    from uuid import UUID
    from sqlalchemy.orm.attributes import flag_modified
    from app.models import RevenueSimulation
    from app.database import get_db
    from app.main import app
    saved = client.post('/api/v1/recipes',json=recipe_data).json()
    simulation = client.post('/api/v1/simulations',json={'recipe_id':saved['id'],'quantity_sold':5}).json()
    db = app.dependency_overrides[get_db]()
    row = db.get(RevenueSimulation, UUID(simulation['id']))
    snapshot = row.recipe_snapshot
    for item in snapshot['recipe']['ingredients']:
        item.pop('base_unit', None)
        item.pop('cost_per_base_unit', None)
    row.recipe_snapshot = dict(snapshot)
    flag_modified(row, 'recipe_snapshot')
    db.commit()
    response = client.get('/api/v1/simulations/'+simulation['id'])
    assert response.status_code == 200
    assert response.json()['results'] == simulation['results']
    assert client.get('/api/v1/simulations/'+simulation['id']+'/pdf').status_code == 200
