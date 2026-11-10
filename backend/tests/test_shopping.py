from uuid import uuid4
from decimal import Decimal
import pytest
from sqlalchemy import text
from app.main import app
from app.database import get_db
from app.models import User
from app.auth import hash_password

P='/api/v1/shopping-lists'

@pytest.fixture
def shopping_data(ingredient):
    return dict(name='Compras da semana',notes='Conferir validade.',items=[dict(ingredient_id=ingredient['id'],packages=2,purchased=False)])

def test_shopping_crud_pdf_snapshots_and_deleted_source(client,shopping_data,ingredient):
    created=client.post(P,json=shopping_data)
    assert created.status_code==201,created.text
    record=created.json();id=record['id']
    assert Decimal(record['estimated_total'])==80
    assert record['purchased_count']==0
    db=app.dependency_overrides[get_db]()
    raw=db.execute(text('SELECT payload FROM shopping_lists WHERE id=:id'),{'id':id}).scalar()
    assert raw.startswith('enc:v1:') and 'Compras da semana' not in raw
    assert client.get(P+'/'+id).json()==record
    assert client.get(P).json()[0]['id']==id
    pdf=client.get(P+'/'+id+'/pdf')
    assert pdf.status_code==200 and pdf.content.startswith(b'%PDF-')
    assert 'no-store' in pdf.headers['cache-control']
    assert 'attachment' in pdf.headers['content-disposition']
    changed={key:ingredient[key] for key in ('name','measurement_unit','package_quantity','package_price','is_active')}
    changed.update(name='Novo nome',package_price='99')
    assert client.put('/api/v1/ingredients/'+ingredient['id'],json=changed).status_code==200
    data=dict(shopping_data,items=[dict(ingredient_id=ingredient['id'],packages=3,purchased=True)])
    updated=client.put(P+'/'+id,json=data).json()
    assert updated['items'][0]['name']=='Chocolate'
    assert Decimal(updated['estimated_total'])==120
    assert Decimal(updated['pending_total'])==0
    assert updated['purchased_count']==1
    assert client.delete('/api/v1/ingredients/'+ingredient['id']).status_code==200
    assert client.put(P+'/'+id,json=data).status_code==200
    assert client.get(P+'/'+id+'/pdf').status_code==200
    assert client.delete(P+'/'+id).status_code==204
    assert client.get(P+'/'+id).status_code==404

def test_shopping_all_units_exact_costs_and_archive_rules(client):
    ids=[]
    for unit in ('g','kg','ml','un'):
        record=client.post('/api/v1/ingredients',json=dict(name=unit,measurement_unit=unit,package_quantity='1.25',package_price='5.27')).json()
        ids.append(record['id'])
    payload=dict(name='Medidas',items=[dict(ingredient_id=id,packages=2) for id in ids])
    response=client.post(P,json=payload).json()
    assert Decimal(response['estimated_total'])==Decimal('42.16')
    assert {item['measurement_unit'] for item in response['items']}=={'g','kg','ml','un'}
    assert client.delete('/api/v1/ingredients/'+ids[0]+'?archive=true').status_code==200
    assert client.post(P,json=payload).status_code==422
    assert client.put(P+'/'+response['id'],json=payload).status_code==200

@pytest.mark.parametrize('patch',[
    {'name':' '},{'items':[]},{'owner_id':str(uuid4())},
])
def test_invalid_shopping_lists(client,shopping_data,patch):
    assert client.post(P,json=shopping_data|patch).status_code==422

@pytest.mark.parametrize('patch',[{'packages':0},{'packages':-1},{'packages':1.5},{'packages':1000001},{'purchased':'yes'},{'package_price':'1'}])
def test_invalid_shopping_items(client,shopping_data,patch):
    payload=shopping_data|{'items':[shopping_data['items'][0]|patch]}
    assert client.post(P,json=payload).status_code==422

def test_duplicate_shopping_items(client,shopping_data):
    assert client.post(P,json=shopping_data|{'items':shopping_data['items']*2}).status_code==422

@pytest.mark.auth
def test_shopping_cannot_access_foreign_lists_or_ingredients(client):
    assert client.get(P).status_code==401
    db=app.dependency_overrides[get_db]()
    password='shopping-test-password'
    users=[User(email=f'shopping-{i}@example.test',password_hash=hash_password(password)) for i in range(2)]
    db.add_all(users);db.commit()
    client.post('/api/v1/auth/login',json=dict(email=users[0].email,password=password))
    ingredient=client.post('/api/v1/ingredients',json=dict(name='Material A',measurement_unit='un',package_quantity='10',package_price='15')).json()
    data=dict(name='Lista A',items=[dict(ingredient_id=ingredient['id'],packages=1)])
    saved=client.post(P,json=data).json();id=saved['id']
    client.post('/api/v1/auth/logout')
    assert client.get(P+'/'+id+'/pdf').status_code==401
    client.post('/api/v1/auth/login',json=dict(email=users[1].email,password=password))
    assert client.get(P).json()==[]
    assert client.get(P+'/'+id).status_code==404
    assert client.get(P+'/'+id+'/pdf').status_code==404
    assert client.put(P+'/'+id,json=data).status_code==404
    assert client.delete(P+'/'+id).status_code==404
    assert client.post(P,json=data).status_code==422
    assert client.get(P).json()==[]
