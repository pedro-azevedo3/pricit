from decimal import Decimal as D
from uuid import uuid4
import pytest
P='/api/v1'

def create_recipe(client,data):
    response=client.post(P+'/recipes',json=data)
    assert response.status_code==201,response.text
    return response.json()

@pytest.mark.parametrize('unit,quantity',[('g','1000'),('kg','1')])
def test_create_ingredient(client,unit,quantity):
    r=client.post(P+'/ingredients',json=dict(name=' Farinha ',measurement_unit=unit,package_quantity=quantity,package_price='6'))
    assert r.status_code==201
    assert r.json()['name']=='Farinha'
    assert D(r.json()['cost_per_gram'])==D('.006')
    assert D(r.json()['cost_per_kg'])==6
    assert client.get(P+'/ingredients/'+r.json()['id']).status_code==200

@pytest.mark.parametrize('patch',[{'name':' '},{'package_quantity':'0'},{'package_quantity':'-1'},{'package_price':'-1'},{'measurement_unit':'l'},{'package_price':'NaN'},{'package_quantity':'0.0000001'}])
def test_invalid_ingredients(client,patch):
    data=dict(name='Chocolate',measurement_unit='kg',package_quantity='1',package_price='40')|patch
    assert client.post(P+'/ingredients',json=data).status_code==422

def test_save_update_duplicate_and_delete(client,recipe_data):
    r=create_recipe(client,recipe_data)
    read=client.get(P+'/recipes/'+r['id']).json()
    assert D(read['pricing']['ingredients_cost'])==8
    assert read['ingredients'][0]['name']=='Chocolate'
    recipe_data['name']='Brownie especial'
    updated=client.put(P+'/recipes/'+r['id'],json=recipe_data)
    assert updated.status_code==200,updated.text
    duplicate=client.post(P+'/recipes/'+r['id']+'/duplicate')
    assert duplicate.status_code==201,duplicate.text
    assert duplicate.json()['id']!=r['id']
    assert duplicate.json()['name']=='Brownie especial (cópia)'
    assert client.delete(P+'/recipes/'+r['id']).status_code==204
    assert client.get(P+'/recipes/'+r['id']).status_code==404

def test_prices_update_without_changing_history(client,ingredient,recipe_data):
    r=create_recipe(client,recipe_data)
    response=client.post(P+'/simulations',json=dict(recipe_id=r['id'],quantity_sold=100))
    assert response.status_code==201,response.text
    sim=response.json()
    data={k:ingredient[k] for k in ['name','measurement_unit','package_quantity','package_price','is_active']}
    data['package_price']='80'
    assert client.put(P+'/ingredients/'+ingredient['id'],json=data).status_code==200
    updated=client.get(P+'/recipes/'+r['id']).json()
    assert D(updated['pricing']['ingredients_cost'])==16
    assert client.get(P+'/simulations/'+sim['id']).json()==sim
    for path in [f"/recipes/{r['id']}/pdf",f"/simulations/{sim['id']}/pdf"]:
        pdf=client.get(P+path)
        assert pdf.status_code==200,pdf.text
        assert pdf.content.startswith(b'%PDF-') and len(pdf.content)>2000
    assert client.delete(P+'/recipes/'+r['id']).status_code==204
    history=client.get(P+'/simulations/'+sim['id']).json()
    assert history['recipe_id'] is None
    assert history['results']==sim['results']
    assert history['recipe_snapshot']==sim['recipe_snapshot']
    assert client.get(P+f"/simulations/{sim['id']}/pdf").status_code==200

def test_archive_existing_ingredients(client,ingredient,recipe_data):
    r=create_recipe(client,recipe_data)
    assert client.delete(P+'/ingredients/'+ingredient['id']).status_code==409
    assert client.delete(P+'/ingredients/'+ingredient['id']+'?archive=true').json()['action']=='archived'
    assert not any(i['id']==ingredient['id'] for i in client.get(P+'/ingredients').json())
    assert client.get(P+'/ingredients/'+ingredient['id']).json()['is_active'] is False
    assert client.put(P+'/recipes/'+r['id'],json=recipe_data).status_code==200
    assert client.get(P+'/recipes/'+r['id']).json()['ingredients'][0]['is_active'] is False
    assert client.post(P+'/recipes',json=recipe_data).status_code==422
    assert client.post(P+'/recipes/'+r['id']+'/duplicate').status_code==422
    assert client.delete(P+'/recipes/'+r['id']).status_code==204
    assert client.delete(P+'/ingredients/'+ingredient['id']).json()['action']=='deleted'

@pytest.mark.parametrize('patch',[{'yield_quantity':0},{'yield_quantity':1.5},{'production_time_minutes':-1},{'packaging_unit_cost':'-1'},{'packaging_quantity':-1},{'operational_expense_percentage':'-1'},{'hourly_labor_cost':'-1'},{'desired_markup_percentage':'-1'},{'selling_price':'-1'},{'ingredients':[]}])
def test_invalid_recipes(client,recipe_data,patch):
    assert client.post(P+'/recipes',json=recipe_data|patch).status_code==422

def test_duplicate_and_missing_ingredient(client,recipe_data):
    recipe_data['ingredients']*=2
    assert client.post(P+'/recipes',json=recipe_data).status_code==422
    recipe_data['ingredients']=recipe_data['ingredients'][:1]
    recipe_data['ingredients'][0]['ingredient_id']=str(uuid4())
    assert client.post(P+'/recipes',json=recipe_data).status_code==422

@pytest.mark.parametrize('patch',[{'quantity_sold':0},{'quantity_sold':1.5},{'selling_price':'-1'}])
def test_invalid_simulation(client,recipe_data,patch):
    r=create_recipe(client,recipe_data)
    assert client.post(P+'/simulations',json=dict(recipe_id=r['id'],quantity_sold=100)|patch).status_code==422

def test_zero_sales_price_and_fallback(client,recipe_data):
    recipe_data['selling_price']=None
    r=create_recipe(client,recipe_data)
    sim=client.post(P+'/simulations',json=dict(recipe_id=r['id'],quantity_sold=13)).json()
    assert D(sim['results']['selling_price'])==D(r['pricing']['suggested_price'])
    assert sim['results']['batches']==2 and sim['results']['surplus']==11
    zero=client.post(P+'/simulations',json=dict(recipe_id=r['id'],quantity_sold=13,selling_price='0')).json()
    assert D(zero['results']['margin'])==0 and D(zero['results']['revenue'])==0
    assert D(zero['results']['profit'])<0

def test_search_sort_and_subtotal(client,recipe_data):
    second=client.post(P+'/ingredients',json=dict(name='Farinha',measurement_unit='g',package_quantity='1000',package_price='6')).json()
    recipe_data['ingredients'].append(dict(ingredient_id=second['id'],quantity_used='.15',measurement_unit='kg'))
    r=create_recipe(client,recipe_data)
    assert D(r['pricing']['ingredients_cost'])==D('8.9')
    assert client.get(P+'/ingredients?search=farinha').json()[0]['id']==second['id']
    assert client.get(P+'/ingredients?sort=price').status_code==200
    assert client.get(P+'/ingredients?sort=date').status_code==200
