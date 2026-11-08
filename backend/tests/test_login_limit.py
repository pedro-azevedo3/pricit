import asyncio
from concurrent.futures import ThreadPoolExecutor
from types import SimpleNamespace
from unittest.mock import Mock

import pytest
from app.login_limit import LoginLimiter, LoginRateLimitMiddleware
from app.main import app

pytestmark = pytest.mark.auth


def test_source_and_global_windows_expire_without_sleep():
    time = [0.0]
    limiter = LoginLimiter(per_source=2, total=3, clock=lambda: time[0])
    for source in ('a', 'a', 'b'):
        assert limiter.acquire(source) == 0
        limiter.release()
    assert limiter.acquire('a') == 60
    assert limiter.acquire('c') == 60  # Global limit also covers changing sources.
    time[0] = 59.1
    assert limiter.acquire('a') == 1
    time[0] = 60
    assert limiter.acquire('a') == 0
    limiter.release()


def test_concurrent_requests_are_bounded_atomically():
    limiter = LoginLimiter(concurrent=2)
    with ThreadPoolExecutor(max_workers=16) as pool:
        attempts = list(pool.map(lambda _: limiter.acquire('source'), range(16)))
    assert attempts.count(0) == 2
    assert attempts.count(1) == 14
    limiter.release()
    limiter.release()
    assert limiter.acquire('other') == 0
    limiter.release()


def test_source_storage_is_bounded_and_recovers():
    time = [0.0]
    limiter = LoginLimiter(max_sources=2, clock=lambda: time[0])
    for source in ('a', 'b'):
        assert limiter.acquire(source) == 0
        limiter.release()
    assert limiter.acquire('c') == 60
    assert len(limiter._sources) == 2
    time[0] = 60
    assert limiter.acquire('c') == 0
    limiter.release()
    assert len(limiter._sources) == 1


def test_unknown_emails_and_spoofed_headers_are_limited_before_hashing(client, monkeypatch):
    verify = Mock(return_value=False)
    monkeypatch.setattr('app.auth.verify_password', verify)
    monkeypatch.setattr(app.state, 'login_limiter', LoginLimiter(per_source=3))
    for index in range(3):
        response = client.post('/api/v1/auth/login', json={'email':f'unknown{index}@example.com','password':'wrong'},
                               headers={'X-Forwarded-For':f'192.0.2.{index}', 'X-Real-IP':f'192.0.2.{index}'})
        assert response.status_code == 401
    response = client.post('/api/v1/auth/login', json={'email':'different@example.com','password':'wrong'},
                           headers={'X-Forwarded-For':'198.51.100.1', 'X-Real-IP':'198.51.100.1'})
    assert response.status_code == 429
    assert 1 <= int(response.headers['retry-after']) <= 60
    assert 'no-store' in response.headers['cache-control']
    assert verify.call_count == 3
    assert client.get('/health').status_code == 200
    assert client.get('/api/v1/auth/me').status_code == 401


def test_malformed_login_bodies_also_consume_quota(client, monkeypatch):
    monkeypatch.setattr(app.state, 'login_limiter', LoginLimiter(per_source=2))
    for _ in range(2):
        assert client.post('/api/v1/auth/login', content='{', headers={'Content-Type':'application/json'}).status_code == 422
    assert client.post('/api/v1/auth/login', content='{', headers={'Content-Type':'application/json'}).status_code == 429


def test_saturated_middleware_does_not_read_body_and_releases_after_error():
    async def run():
        limiter = LoginLimiter(concurrent=1)
        scope = {'type':'http','method':'POST','path':'/api/v1/auth/login', 'client':('127.0.0.1',1234),
                 'app':SimpleNamespace(state=SimpleNamespace(login_limiter=limiter))}
        messages = []
        async def receive():
            raise AssertionError('Rejected login body must not be read')
        async def send(message):
            messages.append(message)
        async def downstream(*_):
            raise RuntimeError('request failed')
        middleware = LoginRateLimitMiddleware(downstream)
        assert limiter.acquire('existing') == 0
        await middleware(scope, receive, send)
        assert messages[0]['status'] == 429
        limiter.release()
        with pytest.raises(RuntimeError, match='request failed'):
            await middleware(scope, receive, send)
        assert limiter.acquire('next') == 0
        limiter.release()
    asyncio.run(run())
