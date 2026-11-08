from datetime import timedelta
import hashlib
import pytest
from sqlalchemy import select
from app.auth import hash_password, verify_password
from app.database import get_db
from app.main import app
from app.models import User, UserSession, now

pytestmark = pytest.mark.auth


def create_user():
    db = app.dependency_overrides[get_db]()
    user = User(email='auth@example.com', password_hash=hash_password('uma-senha-segura-123'))
    db.add(user)
    db.commit()
    return db, user


def login(client, password='uma-senha-segura-123'):
    return client.post('/api/v1/auth/login', json={'email': ' AUTH@example.com ', 'password': password})


def test_password_hash():
    encoded = hash_password('uma-senha-segura-123')
    assert encoded != hash_password('uma-senha-segura-123')
    assert verify_password('uma-senha-segura-123', encoded)
    assert not verify_password('errada', encoded)
    assert not verify_password('errada', 'invalid')
    with pytest.raises(ValueError):
        hash_password('curta')


def test_login_session_logout(client):
    db, user = create_user()
    assert client.get('/api/v1/ingredients').status_code == 401
    response = login(client)
    assert response.status_code == 200
    assert 'HttpOnly' in response.headers['set-cookie']
    assert 'SameSite=strict' in response.headers['set-cookie']
    token = client.cookies.get('pricit_session')
    assert db.get(UserSession, hashlib.sha256(token.encode()).hexdigest()).user_id == user.id
    assert client.get('/api/v1/auth/me').json() == {'email': user.email}
    assert client.get('/api/v1/ingredients').status_code == 200
    assert client.post('/api/v1/auth/logout').status_code == 204
    client.cookies.set('pricit_session', token)
    assert client.get('/api/v1/auth/me').status_code == 401


def test_invalid_inactive_expired_and_throttled(client):
    db, user = create_user()
    assert login(client, 'errada').status_code == 401
    assert login(client).status_code == 200
    session = db.scalar(select(UserSession).where(UserSession.user_id == user.id))
    session.expires_at = now() - timedelta(seconds=1)
    db.commit()
    assert client.get('/api/v1/auth/me').status_code == 401
    login(client)
    user.is_active = False
    db.commit()
    assert client.get('/api/v1/ingredients').status_code == 401
    assert login(client).status_code == 401
    user.is_active = True
    user.failed_attempts = 0
    db.commit()
    for _ in range(5):
        assert login(client, 'errada').status_code == 401
    assert login(client).status_code == 429


def test_origin_and_protected_routes(client):
    create_user()
    assert client.post('/api/v1/auth/login', headers={'Origin': 'https://evil.example'}, json={'email':'auth@example.com','password':'uma-senha-segura-123'}).status_code == 403
    for path in ('ingredients', 'recipes', 'simulations'):
        assert client.get('/api/v1/' + path).status_code == 401
        assert client.post('/api/v1/' + path, json={}).status_code == 401
    assert client.get('/health').status_code == 200
