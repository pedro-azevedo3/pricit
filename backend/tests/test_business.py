from decimal import Decimal
from sqlalchemy import select, text
from app.main import app
from app.database import get_db
from app.models import User
import pytest

@pytest.mark.auth
def test_questionnaire_registration_profile_and_isolation(client):
    payload = dict(email='beauty@example.test', password='senha-segura-12345', business_name='Salão Ana', business_type='beauty', pricing_goal='set_prices')
    assert client.post('/api/v1/auth/register', json={k:v for k,v in payload.items() if k!='business_type'}).status_code == 422
    response = client.post('/api/v1/auth/register', json=payload)
    assert response.status_code == 201
    assert 'HttpOnly' in response.headers['set-cookie']
    profile = {k:payload[k] for k in ('business_name','business_type','pricing_goal')}
    assert client.get('/api/v1/profile').json() == profile
    db = app.dependency_overrides[get_db]()
    first = db.scalar(select(User).where(User.email == payload['email']))
    encrypted = db.execute(text('SELECT business_name FROM users WHERE id=:id'), {'id':first.id}).scalar()
    assert encrypted.startswith('enc:v1:') and 'Salão' not in encrypted
    assert client.post('/api/v1/auth/register', json=payload).status_code == 409
    assert client.post('/api/v1/auth/logout').status_code == 204
    assert client.get('/api/v1/profile').status_code == 401
    payload.update(email='bakery@example.test', business_name='Padaria B', business_type='bakery')
    assert client.post('/api/v1/auth/register', json=payload).status_code == 201
    assert client.put('/api/v1/profile', json=dict(profile, business_type='acai')).status_code == 200
    db.refresh(first)
    assert first.business_type == 'beauty'
    assert client.put('/api/v1/profile', json=dict(profile, business_type='unknown')).status_code == 422

@pytest.mark.auth
def test_registration_origin_password_validation_and_limiter(client):
    payload = dict(email='a@example.test', password='senha-segura-12345', business_name='A', business_type='burger', pricing_goal='improve_profit')
    assert client.post('/api/v1/auth/register', json=payload, headers={'Origin':'https://evil.example'}).status_code == 403
    assert client.post('/api/v1/auth/register', json=dict(payload,password='short')).status_code == 422
    assert client.post('/api/v1/auth/register', json=dict(payload,business_name='   ')).status_code == 422
    from app.login_limit import LoginLimiter
    app.state.login_limiter = LoginLimiter(per_source=1)
    assert client.post('/api/v1/auth/register', json=payload).status_code == 201
    response = client.post('/api/v1/auth/register', json=dict(payload,email='b@example.test'))
    assert response.status_code == 429
    assert 'Retry-After' in response.headers

def test_service_with_energy_equipment_and_no_consumables(client):
    data = dict(kind='service', name='Corte', yield_quantity=1, production_time_minutes=30, packaging_quantity=0,
                hourly_labor_cost='30', desired_markup_percentage='100', ingredients=[], additional_costs=[
                    dict(name='Energia',category='energy',unit='kwh',quantity='0.2',unit_cost='1.25'),
                    dict(name='Máquina de corte',category='equipment',unit='hour',quantity='0.5',unit_cost='2'),
                ])
    response = client.post('/api/v1/recipes', json=data)
    assert response.status_code == 201, response.text
    recipe = response.json()
    db = app.dependency_overrides[get_db]()
    raw = db.execute(text('SELECT additional_costs FROM recipes WHERE id=:id'), {'id':recipe['id']}).scalar()
    assert raw.startswith('enc:v1:') and 'Máquina' not in raw
    assert Decimal(recipe['pricing']['additional_cost']) == Decimal('1.25')
    assert Decimal(recipe['pricing']['total_cost']) == Decimal('16.25')
    assert Decimal(recipe['pricing']['suggested_price']) == Decimal('32.5')
    assert client.get(f"/api/v1/recipes/{recipe['id']}/pdf").content.startswith(b'%PDF')
    copy = client.post(f"/api/v1/recipes/{recipe['id']}/duplicate").json()
    assert copy['kind']=='service' and copy['additional_costs']==recipe['additional_costs']
    saved = client.post('/api/v1/simulations',json=dict(recipe_id=recipe['id'],quantity_sold=10)).json()
    assert Decimal(saved['results']['production_cost']) == Decimal('162.5')
    changed = client.put(f"/api/v1/recipes/{recipe['id']}", json=dict(data,additional_costs=[])).json()
    assert Decimal(changed['pricing']['total_cost'])==15
    assert client.get(f"/api/v1/simulations/{saved['id']}").json()['recipe_snapshot']['additional_costs']==recipe['additional_costs']
    assert client.post('/api/v1/recipes',json=dict(data,kind='recipe')).status_code==422
    assert client.post('/api/v1/recipes',json=dict(data,additional_costs=[dict(data['additional_costs'][0],quantity='-1')])).status_code==422
    assert client.post('/api/v1/recipes',json=dict(data,additional_costs=[dict(data['additional_costs'][0],unit='invalid')])).status_code==422
