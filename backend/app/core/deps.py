from datetime import datetime, timezone
from typing import Annotated
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from sqlmodel import Session, select

from app.core.security import decode_access_token
from app.core.database import get_session
from app.modules.usuarios.models import Usuario, UsuarioPublic, UsuarioRol


# OAuth2PasswordBearer que lee el token de la cookie HttpOnly
# en lugar del header Authorization. Asi el JS del front nunca lo ve.
class OAuth2PasswordBearerWithCookie(OAuth2PasswordBearer):
    async def __call__(self, request: Request) -> str | None:
        token = request.cookies.get("access_token")
        if not token:
            if self.auto_error:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="No autenticado",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            return None
        return token


oauth2_scheme = OAuth2PasswordBearerWithCookie(tokenUrl="/auth/login")


async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    session: Annotated[Session, Depends(get_session)],
) -> UsuarioPublic:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciales inválidas o token expirado",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception

    sub: str | None = payload.get("sub")
    if sub is None:
        raise credentials_exception

    try:
        user_id = int(sub)
    except (TypeError, ValueError):
        raise credentials_exception

    user = session.get(Usuario, user_id)
    if user is None:
        raise credentials_exception

    # Cargamos roles activos filtrando los expirados
    now = datetime.now(timezone.utc)
    registros = session.exec(
        select(UsuarioRol)
        .where(UsuarioRol.usuario_id == user.id)
        .where(
            (UsuarioRol.expires_at == None) |
            (UsuarioRol.expires_at > now)
        )
    ).all()
    roles = [r.rol_codigo for r in registros]

    return UsuarioPublic(
        id=user.id,
        nombre=user.nombre,
        apellido=user.apellido,
        email=user.email,
        celular=user.celular,
        roles=roles,
        created_at=user.created_at,
        updated_at=user.updated_at,
        deleted_at=user.deleted_at,
    )


async def get_current_active_user(
    current_user: Annotated[UsuarioPublic, Depends(get_current_user)],
) -> UsuarioPublic:
    if current_user.deleted_at is not None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cuenta de usuario desactivada",
        )
    return current_user


def require_role(allowed_roles: list[str]):
    async def role_checker(
        current_user: Annotated[UsuarioPublic, Depends(get_current_active_user)],
    ) -> UsuarioPublic:
        if not any(r in allowed_roles for r in current_user.roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Permisos insuficientes. Tus roles son {current_user.roles}. "
                    f"Se requiere uno de: {allowed_roles}"
                ),
            )
        return current_user
    return role_checker
