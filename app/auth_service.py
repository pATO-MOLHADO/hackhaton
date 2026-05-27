from __future__ import annotations

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


def _sign_in_guest_user() -> UserPublic:
    client = get_supabase_auth_client()
    if client is None:
        raise HTTPException(status_code=500, detail='Supabase Auth nao configurado.')

    response = client.auth.sign_in_with_password(
        {
            'email': settings.guest_user_email,
            'password': settings.guest_user_password,
        }
    )

    user = getattr(response, 'user', None)
    if user is None:
        raise HTTPException(status_code=500, detail='Falha ao autenticar usuario guest.')

    return _to_public_user(user)


def ensure_guest_user() -> UserPublic:
    global _guest_cache

    if _guest_cache is not None:
        return _guest_cache

    try:
        _guest_cache = _sign_in_guest_user()
        return _guest_cache
    except Exception:
        admin_client = get_supabase_admin_client()
        if admin_client is None:
            raise HTTPException(status_code=500, detail='Supabase Admin nao configurado para criar usuario guest.')

        try:
            admin_client.auth.admin.create_user(
                {
                    'email': settings.guest_user_email,
                    'password': settings.guest_user_password,
                    'email_confirm': True,
                    'user_metadata': {'nome': settings.guest_user_name},
                }
            )
        except Exception:
            # If already exists, sign-in below will still work.
            pass

        try:
            _guest_cache = _sign_in_guest_user()
            return _guest_cache
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f'Nao foi possivel preparar usuario guest: {exc}') from exc


def guest_auth_session_response() -> AuthSessionResponse:
    guest_user = ensure_guest_user()
    return AuthSessionResponse(
        access_token='guest-mode-token',
        refresh_token=None,
        email_confirmacao_pendente=False,
        user=guest_user,
    )


def signup_user(payload: AuthSignupRequest) -> AuthSessionResponse:
    client = get_supabase_auth_client()
    if client is None:
        raise HTTPException(status_code=500, detail='Supabase Auth nao configurado.')

    response = client.auth.sign_up(
        {
            'email': payload.email,
            'password': payload.senha,
            'options': {'data': {'nome': payload.nome or ''}},
        }
    )

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
    client = get_supabase_auth_client()
    if client is None:
        raise HTTPException(status_code=500, detail='Supabase Auth nao configurado.')

    response = client.auth.sign_in_with_password(
        {
            'email': payload.email,
            'password': payload.senha,
        }
    )

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
    client = get_supabase_auth_client()
    if client is None:
        raise HTTPException(status_code=500, detail='Supabase Auth nao configurado.')

    response = client.auth.get_user(access_token)
    user = getattr(response, 'user', None)

    if user is None:
        raise HTTPException(status_code=401, detail='Token invalido ou expirado.')

    return _to_public_user(user)
