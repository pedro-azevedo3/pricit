import os
os.environ.setdefault('DATABASE_URL', 'postgresql+psycopg://izyprice:izyprice_local@localhost:5432/izyprice')
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.database import engine, get_db
from app.main import app
from app.auth import current_user
from app.login_limit import LoginLimiter

@pytest.fixture
def client(request, monkeypatch):
    monkeypatch.setattr(app.state, 'login_limiter', LoginLimiter())
    with engine.connect() as connection:
        transaction = connection.begin()
        with Session(bind=connection, join_transaction_mode='create_savepoint', expire_on_commit=False) as session:
            if not request.node.get_closest_marker('auth'):
                app.dependency_overrides[current_user] = lambda: object()
            app.dependency_overrides[get_db] = lambda: session
            with TestClient(app) as client:
                yield client
            app.dependency_overrides.clear()
        transaction.rollback()

@pytest.fixture
def ingredient(client):
    return client.post('/api/v1/ingredients', json=dict(name='Chocolate',measurement_unit='kg',package_quantity='1',package_price='40')).json()

@pytest.fixture
def recipe_data(ingredient):
    return dict(name='Brownie',description='Receita de teste',yield_quantity=12,production_time_minutes=90,packaging_unit_cost='0.50',packaging_quantity=12,operational_expense_percentage='10',hourly_labor_cost='20',desired_markup_percentage='50',selling_price='8',ingredients=[dict(ingredient_id=ingredient['id'],quantity_used='200',measurement_unit='g')])
