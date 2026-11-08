"""Password authentication for the shared local workspace."""
import hashlib
import hmac
import os
import secrets
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import delete, select
from sqlalchemy.orm import Session
from .database import get_db
from .models import User, UserSession, now

COOKIE = 'pricit_session'
SESSION_SECONDS = 60 * 60 * 24 * 7
router = APIRouter(prefix='/api/v1/auth')


def hash_password(password: str) -> str:
    if not 12 <= len(password) <= 256:
        raise ValueError('A senha deve ter entre 12 e 256 caracteres.')
    salt = secrets.token_hex(16)
    digest = hashlib.scrypt(password.encode(), salt=bytes.fromhex(salt), n=16384, r=8, p=1).hex()
    return f'scrypt${salt}${digest}'


def verify_password(password: str, encoded: str) -> bool:
    try:
        algorithm, salt, expected = encoded.split('$')
        if algorithm != 'scrypt':
            return False
        actual = hashlib.scrypt(password.encode(), salt=bytes.fromhex(salt), n=16384, r=8, p=1).hex()
        return hmac.compare_digest(actual, expected)
    except (ValueError, TypeError):
        return False


DUMMY_HASH = hash_password(secrets.token_urlsafe(32))


class Credentials(BaseModel):
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=1, max_length=256, repr=False)

    @field_validator('email')
    @classmethod
    def normalize_email(cls, value):
        value = value.strip().lower()
        if value.count('@') != 1 or any(c.isspace() for c in value) or not all(value.split('@')):
            raise ValueError('Informe um e-mail válido.')
        return value


def check_origin(request: Request):
    # JSON requests and same-origin browser mutations protect cookie sessions from CSRF.
    origin = request.headers.get('origin')
    allowed = os.getenv('CORS_ORIGINS', 'http://localhost:3000,http://127.0.0.1:3000').split(',')
    if request.method not in ('GET', 'HEAD', 'OPTIONS') and origin and origin not in allowed:
        raise HTTPException(403, 'Origem não permitida.')


def current_user(request: Request, db: Session = Depends(get_db)):
    check_origin(request)
    token = request.cookies.get(COOKIE, '')
    session = db.get(UserSession, hashlib.sha256(token.encode()).hexdigest()) if token else None
    if session is None or session.expires_at <= now():
        raise HTTPException(401, 'Entre com seu e-mail e senha para continuar.')
    user = db.get(User, session.user_id)
    if user is None or not user.is_active:
        raise HTTPException(401, 'Entre com seu e-mail e senha para continuar.')
    return user


@router.post('/login', dependencies=[Depends(check_origin)])
def login(data: Credentials, response: Response, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == data.email).with_for_update())
    valid = verify_password(data.password, user.password_hash if user else DUMMY_HASH)
    if user and user.locked_until and user.locked_until > now():
        raise HTTPException(429, 'Muitas tentativas. Aguarde 15 minutos e tente novamente.')
    if not user or not valid or not user.is_active:
        if user:
            user.failed_attempts += 1
            if user.failed_attempts >= 5:
                user.locked_until = now() + timedelta(minutes=15)
                user.failed_attempts = 0
            db.commit()
        raise HTTPException(401, 'E-mail ou senha inválidos.')
    user.failed_attempts = 0
    user.locked_until = None
    token = secrets.token_urlsafe(32)
    db.execute(delete(UserSession).where(UserSession.expires_at <= now()))
    db.add(UserSession(token_hash=hashlib.sha256(token.encode()).hexdigest(), user_id=user.id,
                       expires_at=now() + timedelta(seconds=SESSION_SECONDS)))
    db.commit()
    response.set_cookie(COOKIE, token, max_age=SESSION_SECONDS, httponly=True,
                        secure=os.getenv('AUTH_COOKIE_SECURE', 'false').lower() == 'true', samesite='strict', path='/')
    response.headers['Cache-Control'] = 'no-store'
    return {'email': user.email}


@router.get('/me')
def me(response: Response, user: User = Depends(current_user)):
    response.headers['Cache-Control'] = 'no-store'
    return {'email': user.email}


@router.post('/logout', status_code=204, dependencies=[Depends(check_origin)])
def logout(request: Request, db: Session = Depends(get_db)):
    token = request.cookies.get(COOKIE, '')
    db.execute(delete(UserSession).where(UserSession.token_hash == hashlib.sha256(token.encode()).hexdigest()))
    db.commit()
    response = Response(status_code=204)
    response.delete_cookie(COOKIE, path='/')
    return response
