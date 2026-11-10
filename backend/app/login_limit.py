"""Bounded, process-local admission control before login body parsing or password work."""
from collections import deque
from dataclasses import dataclass
import math
from threading import Lock
from time import monotonic
from starlette.responses import JSONResponse


@dataclass
class Bucket:
    attempts: deque
    last_seen: float


class LoginLimiter:
    def __init__(self, *, per_source=10, total=60, window=60, concurrent=2, max_sources=1024, clock=monotonic):
        self.per_source = per_source
        self.total = total
        self.window = window
        self.concurrent = concurrent
        self.max_sources = max_sources
        self.clock = clock
        self._lock = Lock()
        self._sources = {}
        self._attempts = deque()
        self._active = 0

    def acquire(self, source):
        """Return zero when admitted, otherwise seconds to wait. Rejections do not queue."""
        with self._lock:
            now = self.clock()
            cutoff = now - self.window
            while self._attempts and self._attempts[0] <= cutoff:
                self._attempts.popleft()
            # All state is bounded even when a caller rotates source addresses.
            for key in [key for key, bucket in self._sources.items() if bucket.last_seen <= cutoff]:
                del self._sources[key]
            bucket = self._sources.get(source)
            if bucket:
                while bucket.attempts and bucket.attempts[0] <= cutoff:
                    bucket.attempts.popleft()
                if len(bucket.attempts) >= self.per_source:
                    return max(1, math.ceil(bucket.attempts[0] + self.window - now))
            if len(self._attempts) >= self.total:
                return max(1, math.ceil(self._attempts[0] + self.window - now))
            if self._active >= self.concurrent:
                return 1
            if bucket is None:
                if len(self._sources) >= self.max_sources:
                    return max(1, math.ceil(min(b.last_seen for b in self._sources.values()) + self.window - now))
                bucket = self._sources[source] = Bucket(deque(), now)
            bucket.attempts.append(now)
            bucket.last_seen = now
            self._attempts.append(now)
            self._active += 1
            return 0

    def release(self):
        with self._lock:
            self._active -= 1


class LoginRateLimitMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope['type'] != 'http' or scope['method'] != 'POST' or scope['path'].rstrip('/') not in ('/api/v1/auth/login', '/api/v1/auth/register'):
            return await self.app(scope, receive, send)
        # Use the transport peer (or Uvicorn's explicitly trusted proxy resolution).
        # Arbitrary X-Forwarded-For / X-Real-IP headers cannot create new quotas.
        source = scope.get('client')
        source = source[0] if source else 'unknown'
        limiter = scope['app'].state.login_limiter
        retry_after = limiter.acquire(source)
        if retry_after:
            response = JSONResponse(
                {'detail': f'Muitas tentativas de acesso. Aguarde {retry_after} segundo(s) e tente novamente.'},
                status_code=429,
                headers={'Retry-After': str(retry_after), 'Cache-Control': 'no-store'},
            )
            return await response(scope, receive, send)
        try:
            await self.app(scope, receive, send)
        finally:
            limiter.release()
