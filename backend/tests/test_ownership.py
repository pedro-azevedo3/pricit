from contextlib import ExitStack
from uuid import UUID, uuid4
import pytest
from fastapi.testclient import TestClient
from app.auth import hash_password
from app.database import get_db
from app.main import app
from app.models import Ingredient, Recipe, RevenueSimulation, User

pytestmark = pytest.mark.auth


@pytest.fixture
def accounts(client):
    db = app.dependency_overrides[get_db]()
    password = 'ownership-test-password'
    users = [User(email=f'owner-{index}-{uuid4().hex}@example.test', password_hash=hash_password(password)) for index in range(2)]
    db.add_all(users)
    db.commit()
    with ExitStack() as stack:
        clients = [stack.enter_context(TestClient(app)) for _ in users]
        for api, user in zip(clients, users):
            assert api.post('/api/v1/auth/login',json={'email':user.email,'password':password}).status_code == 200
        yield db, users, clients


def seed(api, suffix):
    ingredient_data = {'name':'Ovos '+suffix,'measurement_unit':'un','package_quantity':'12','package_price':'18'}
    response = api.post('/api/v1/ingredients',json=ingredient_data)
    assert response.status_code == 201, response.text
    ingredient = response.json()
    recipe_data = {'name':'Receita '+suffix,'yield_quantity':2,'packaging_quantity':0,
                   'ingredients':[{'ingredient_id':ingredient['id'],'measurement_unit':'un','quantity_used':'2'}]}
    response = api.post('/api/v1/recipes',json=recipe_data)
    assert response.status_code == 201, response.text
    recipe = response.json()
    response = api.post('/api/v1/simulations',json={'recipe_id':recipe['id'],'quantity_sold':4})
    assert response.status_code == 201, response.text
    return ingredient_data, ingredient, recipe_data, recipe, response.json()


def test_accounts_only_list_and_access_their_own_records(accounts):
    db, users, (a,b) = accounts
    records = [seed(a,'A'), seed(b,'B')]
    for api, user, own, other in [(a,users[0],records[0],records[1]), (b,users[1],records[1],records[0])]:
        for resource, model, index in [('ingredients',Ingredient,1),('recipes',Recipe,3),('simulations',RevenueSimulation,4)]:
            own_id, other_id = own[index]['id'], other[index]['id']
            rows = api.get('/api/v1/'+resource).json()
            assert {row['id'] for row in rows} == {own_id}
            assert db.get(model,UUID(own_id)).owner_id == user.id
            assert api.get(f'/api/v1/{resource}/{own_id}').status_code == 200
            assert api.get(f'/api/v1/{resource}/{other_id}').status_code == 404
        for resource,index in [('recipes',3),('simulations',4)]:
            own_pdf = api.get(f"/api/v1/{resource}/{own[index]['id']}/pdf")
            assert own_pdf.status_code == 200 and own_pdf.content.startswith(b'%PDF-')
            assert 'no-store' in own_pdf.headers['cache-control']
            assert api.get(f"/api/v1/{resource}/{other[index]['id']}/pdf").status_code == 404
        assert api.get('/api/v1/ingredients',params={'search':other[1]['name'],'include_archived':'true','sort':'date'}).json() == []


def test_foreign_ids_cannot_mutate_duplicate_or_link_data(accounts):
    db, _, (a,b) = accounts
    own, other = seed(a,'A'), seed(b,'B')
    foreign_ingredient, foreign_recipe = other[1]['id'], other[3]['id']
    assert a.put('/api/v1/ingredients/'+foreign_ingredient,json=other[0]|{'package_price':'999'}).status_code == 404
    assert a.delete('/api/v1/ingredients/'+foreign_ingredient+'?archive=true').status_code == 404
    assert a.delete('/api/v1/ingredients/'+foreign_ingredient).status_code == 404
    assert a.put('/api/v1/recipes/'+foreign_recipe,json=other[2]).status_code == 404
    assert a.delete('/api/v1/recipes/'+foreign_recipe).status_code == 404
    assert a.post('/api/v1/recipes/'+foreign_recipe+'/duplicate').status_code == 404
    assert a.post('/api/v1/simulations',json={'recipe_id':foreign_recipe,'quantity_sold':2}).status_code == 404
    cross = own[2] | {'ingredients':[{'ingredient_id':foreign_ingredient,'measurement_unit':'un','quantity_used':'1'}]}
    assert a.post('/api/v1/recipes',json=cross).status_code == 422
    assert a.put('/api/v1/recipes/'+own[3]['id'],json=cross).status_code == 422
    assert b.get('/api/v1/ingredients/'+foreign_ingredient).json()['package_price'] == other[1]['package_price']
    assert b.get('/api/v1/recipes/'+foreign_recipe).json() == other[3]
    assert a.get('/api/v1/recipes/'+own[3]['id']).json() == own[3]


def test_owner_cannot_be_spoofed_and_new_duplicates_belong_to_creator(accounts):
    db, users, (a,b) = accounts
    own = seed(a,'A')
    assert a.post('/api/v1/ingredients',json=own[0]|{'owner_id':str(users[1].id)}).status_code == 422
    assert a.post('/api/v1/recipes',json=own[2]|{'owner_id':str(users[1].id)}).status_code == 422
    assert a.post('/api/v1/simulations',json={'recipe_id':own[3]['id'],'quantity_sold':1,'owner_id':str(users[1].id)}).status_code == 422
    copied = a.post('/api/v1/recipes/'+own[3]['id']+'/duplicate')
    assert copied.status_code == 201
    assert db.get(Recipe,UUID(copied.json()['id'])).owner_id == users[0].id
    assert b.get('/api/v1/recipes/'+copied.json()['id']).status_code == 404


def test_legacy_unowned_records_are_preserved_and_hidden(accounts):
    db, _, (a,b) = accounts
    own = seed(a,'legacy')
    for model,index in [(Ingredient,1),(Recipe,3),(RevenueSimulation,4)]:
        obj = db.get(model,UUID(own[index]['id']))
        obj.owner_id = None
    db.commit()
    for api in (a,b):
        for resource,index in [('ingredients',1),('recipes',3),('simulations',4)]:
            assert api.get('/api/v1/'+resource).json() == []
            assert api.get(f"/api/v1/{resource}/{own[index]['id']}").status_code == 404
    assert db.get(Ingredient,UUID(own[1]['id'])).name == own[1]['name']
    assert db.get(Recipe,UUID(own[3]['id'])).owner_id is None
    assert db.get(RevenueSimulation,UUID(own[4]['id'])).recipe_snapshot['recipe']['name'] == own[3]['name']


def test_deleted_recipe_history_stays_private(accounts):
    _, _, (a,b) = accounts
    own = seed(a,'A')
    assert a.delete('/api/v1/recipes/'+own[3]['id']).status_code == 204
    history = a.get('/api/v1/simulations/'+own[4]['id'])
    assert history.status_code == 200 and history.json()['recipe_id'] is None
    assert history.json()['results'] == own[4]['results']
    assert b.get('/api/v1/simulations/'+own[4]['id']).status_code == 404
    assert b.get('/api/v1/simulations/'+own[4]['id']+'/pdf').status_code == 404


def test_corrupt_cross_account_link_is_not_serialized(accounts):
    db, users, (a,_) = accounts
    own = seed(a,'A')
    db.get(Ingredient,UUID(own[1]['id'])).owner_id = users[1].id
    db.commit()
    for path in ['/api/v1/recipes','/api/v1/recipes/'+own[3]['id'],'/api/v1/recipes/'+own[3]['id']+'/pdf']:
        response = a.get(path)
        assert response.status_code == 404
        assert own[1]['name'] not in response.text


def test_reviewed_legacy_assignment_requires_consistent_graph_and_is_explicit(accounts):
    from app.assign_legacy import Assignment, assign_reviewed_records
    db, users, (a,b) = accounts
    own = seed(a,'legacy')
    for model,index in [(Ingredient,1),(Recipe,3),(RevenueSimulation,4)]:
        db.get(model,UUID(own[index]['id'])).owner_id = None
    db.commit()
    manifest = Assignment(ingredients=[own[1]['id']],recipes=[own[3]['id']],simulations=[own[4]['id']])
    counts = assign_reviewed_records(db,users[0].email,manifest)
    assert counts == {'ingredients':1,'recipes':1,'simulations':1}
    assert a.get('/api/v1/ingredients').json() == []
    with pytest.raises(ValueError,match='vinculadas'):
        assign_reviewed_records(db,users[0].email,Assignment(ingredients=[own[1]['id']]),apply=True)
    with pytest.raises(ValueError,match='ingredientes legados'):
        assign_reviewed_records(db,users[0].email,Assignment(recipes=[own[3]['id']]),apply=True)
    with pytest.raises(ValueError,match='mesma conta'):
        assign_reviewed_records(db,users[0].email,Assignment(simulations=[own[4]['id']]),apply=True)
    assign_reviewed_records(db,users[0].email,manifest,apply=True)
    db.commit()
    assert a.get('/api/v1/ingredients/'+own[1]['id']).status_code == 200
    assert b.get('/api/v1/ingredients/'+own[1]['id']).status_code == 404
    assert a.get('/api/v1/recipes/'+own[3]['id']).status_code == 200
    assert b.get('/api/v1/recipes/'+own[3]['id']).status_code == 404
    assert a.get('/api/v1/simulations/'+own[4]['id']).status_code == 200
    with pytest.raises(ValueError,match='transferir'):
        assign_reviewed_records(db,users[1].email,manifest,apply=True)
