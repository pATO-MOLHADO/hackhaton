from __future__ import annotations

import uuid

from fastapi import HTTPException

from .db import get_supabase_admin_client, get_supabase_auth_client
from .models import AuthLoginRequest, AuthSessionResponse, AuthSignupRequest, UserPublic
from .settings import settings

_guest_cache: UserPublic | None = None


def _user_name(user: object) -> str | None:
    metadata = getattr(user, 'user_metadata', None)
    if isinstance(metadata, dict):
        return metadata.get('nome') or metadata.get('name')
    return None


def _to_public_user(user: object) -> UserPublic:
    user_id = getattr(user, 'id', None)
    if not user_id:
        raise HTTPException(status_code=401, detail='Usuario invalido.')
    return UserPublic(
        id=str(user_id),
        email=getattr(user, 'email', None),
        nome=_user_name(user),
    )


def ensure_guest_user() -> UserPublic:
    global _guest_cache
    if _guest_cache is not None:
        return _guest_cache

    # Sem Supabase configurado ou auth desabilitado: retorna guest local imediatamente
    if not settings.auth_required or not settings.supabase_url:
        _guest_cache = UserPublic(
            id='guest-local',
            email=settings.guest_user_email,
            nome=settings.guest_user_name,
        )
        return _guest_cache

    # Com auth habilitado e Supabase configurado: tenta login real do guest
    client = get_supabase_auth_client()
    if client is None:
        _guest_cache = UserPublic(id='guest-local', email=settings.guest_user_email, nome=settings.guest_user_name)
        return _guest_cache

    try:
        response = client.auth.sign_in_with_password({
            'email': settings.guest_user_email,
            'password': settings.guest_user_password,
        })
        user = getattr(response, 'user', None)
        if user:
            _guest_cache = _to_public_user(user)
            return _guest_cache
    except Exception:
        pass

    # Tenta criar o guest se não existir
    try:
        admin = get_supabase_admin_client()
        if admin:
            admin.auth.admin.create_user({
                'email': settings.guest_user_email,
                'password': settings.guest_user_password,
                'email_confirm': True,
                'user_metadata': {'nome': settings.guest_user_name},
            })
        response = client.auth.sign_in_with_password({
            'email': settings.guest_user_email,
            'password': settings.guest_user_password,
        })
        user = getattr(response, 'user', None)
        if user:
            _guest_cache = _to_public_user(user)
            return _guest_cache
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f'Nao foi possivel preparar usuario guest: {exc}') from exc

    _guest_cache = UserPublic(id='guest-local', email=settings.guest_user_email, nome=settings.guest_user_name)
    return _guest_cache


def guest_auth_session_response() -> AuthSessionResponse:
    guest_user = ensure_guest_user()
    return AuthSessionResponse(
        access_token='guest-mode-token',
        refresh_token=None,
        email_confirmacao_pendente=False,
        user=guest_user,
    )


def signup_user(payload: AuthSignupRequest) -> AuthSessionResponse:
    # Sem Supabase: retorna sessão fake para demo
    if not settings.supabase_url:
        fake_user = UserPublic(id=str(uuid.uuid4()), email=payload.email, nome=payload.nome)
        return AuthSessionResponse(
            access_token='demo-token',
            refresh_token=None,
            email_confirmacao_pendente=False,
            user=fake_user,
        )

    client = get_supabase_auth_client()
    if client is None:
        raise HTTPException(status_code=500, detail='Supabase Auth nao configurado.')

    response = client.auth.sign_up({
        'email': payload.email,
        'password': payload.senha,
        'options': {'data': {'nome': payload.nome or ''}},
    })

    user = getattr(response, 'user', None)
    session = getattr(response, 'session', None)

    if user is None:
        raise HTTPException(status_code=400, detail='Nao foi possivel criar usuario.')

    return AuthSessionResponse(
        access_token=getattr(session, 'access_token', None) if session else None,
        refresh_token=getattr(session, 'refresh_token', None) if session else None,
        email_confirmacao_pendente=session is None,
        user=_to_public_user(user),
    )


def login_user(payload: AuthLoginRequest) -> AuthSessionResponse:
    # Sem Supabase: aceita qualquer credencial para demo
    if not settings.supabase_url:
        fake_user = UserPublic(id=str(uuid.uuid4()), email=payload.email, nome=payload.email.split('@')[0])
        return AuthSessionResponse(
            access_token='demo-token',
            refresh_token=None,
            email_confirmacao_pendente=False,
            user=fake_user,
        )

    client = get_supabase_auth_client()
    if client is None:
        raise HTTPException(status_code=500, detail='Supabase Auth nao configurado.')

    response = client.auth.sign_in_with_password({
        'email': payload.email,
        'password': payload.senha,
    })

    user = getattr(response, 'user', None)
    session = getattr(response, 'session', None)

    if user is None or session is None:
        raise HTTPException(status_code=401, detail='Credenciais invalidas ou email nao confirmado.')

    return AuthSessionResponse(
        access_token=getattr(session, 'access_token', None),
        refresh_token=getattr(session, 'refresh_token', None),
        email_confirmacao_pendente=False,
        user=_to_public_user(user),
    )


def get_user_by_token(access_token: str) -> UserPublic:
    # Token demo: retorna guest
    if access_token == 'demo-token':
        return ensure_guest_user()

    client = get_supabase_auth_client()
    if client is None:
        raise HTTPException(status_code=500, detail='Supabase Auth nao configurado.')

    response = client.auth.get_user(access_token)
    user = getattr(response, 'user', None)

    if user is None:
        raise HTTPException(status_code=401, detail='Token invalido ou expirado.')

    return _to_public_user(user)
