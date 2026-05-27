from __future__ import annotations

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from .auth_service import ensure_guest_user, get_user_by_token
from .models import UserPublic
from .settings import settings

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> UserPublic:
    if credentials is None:
        if settings.auth_required:
            raise HTTPException(status_code=401, detail='Token bearer obrigatorio.')
        return ensure_guest_user()

    token = credentials.credentials
    if not token:
        raise HTTPException(status_code=401, detail='Token bearer invalido.')

    try:
        return get_user_by_token(token)
    except HTTPException:
        if settings.auth_required:
            raise
        return ensure_guest_user()
