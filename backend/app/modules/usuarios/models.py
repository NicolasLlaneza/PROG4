import hashlib
from datetime import datetime, timezone
from typing import Optional
from sqlmodel import SQLModel, Field
from pydantic import EmailStr


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Rol(SQLModel, table=True):
    __tablename__ = "roles"

    # PK semántica para que sea legible en el payload del JWT
    codigo: str = Field(max_length=20, primary_key=True)
    nombre: str = Field(max_length=50, unique=True, nullable=False)
    descripcion: Optional[str] = Field(default=None)


class Usuario(SQLModel, table=True):
    __tablename__ = "usuarios"

    id: Optional[int] = Field(default=None, primary_key=True)
    nombre: str = Field(max_length=80, nullable=False)
    apellido: str = Field(max_length=80, nullable=False)
    email: str = Field(max_length=254, unique=True, index=True, nullable=False)
    celular: Optional[str] = Field(default=None, max_length=20)
    password_hash: str = Field(max_length=60, nullable=False)
    created_at: datetime = Field(default_factory=_utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=_utcnow, nullable=False)
    deleted_at: Optional[datetime] = Field(default=None)

    @property
    def is_active(self) -> bool:
        return self.deleted_at is None


class UsuarioRol(SQLModel, table=True):
    __tablename__ = "usuario_roles"

    # PK compuesta: un usuario no puede tener el mismo rol dos veces
    usuario_id: int = Field(foreign_key="usuarios.id", primary_key=True)
    rol_codigo: str = Field(foreign_key="roles.codigo", primary_key=True, max_length=20)
    asignado_por_id: Optional[int] = Field(default=None, foreign_key="usuarios.id")
    expires_at: Optional[datetime] = Field(default=None)
    created_at: datetime = Field(default_factory=_utcnow, nullable=False)


class RefreshToken(SQLModel, table=True):
    __tablename__ = "refresh_tokens"

    id: Optional[int] = Field(default=None, primary_key=True)
    usuario_id: int = Field(foreign_key="usuarios.id", nullable=False, index=True)
    # SHA-256 del token plano; jamas guardamos el token en texto plano
    token_hash: str = Field(max_length=64, unique=True, nullable=False)
    expires_at: datetime = Field(nullable=False)
    revoked_at: Optional[datetime] = Field(default=None)
    created_at: datetime = Field(default_factory=_utcnow, nullable=False)

    @staticmethod
    def hash_token(raw_token: str) -> str:
        return hashlib.sha256(raw_token.encode()).hexdigest()

    def is_valid(self) -> bool:
        now = datetime.now(timezone.utc)
        expires = self.expires_at
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)
        return expires > now and self.revoked_at is None


# ---------- Schemas ----------

class UsuarioCreate(SQLModel):
    nombre: str = Field(min_length=1, max_length=80)
    apellido: str = Field(default="", max_length=80)
    email: EmailStr
    celular: Optional[str] = Field(default=None, max_length=20)
    password: str = Field(min_length=8)


class UsuarioPublic(SQLModel):
    id: int
    nombre: str
    apellido: str
    email: str
    celular: Optional[str] = None
    roles: list[str] = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    deleted_at: Optional[datetime] = None


class LoginRequest(SQLModel):
    email: EmailStr
    password: str


class Token(SQLModel):
    # El access_token viaja en la cookie HttpOnly; aca devolvemos metadatos
    # y el user para que el frontend pueda hidratar su store sin un /me extra.
    token_type: str = "Bearer"
    expires_in: int
    user: Optional[UsuarioPublic] = None


class RolPublic(SQLModel):
    codigo: str
    nombre: str
    descripcion: Optional[str] = None


class AsignarRolRequest(SQLModel):
    rol_codigo: str
    expires_at: Optional[datetime] = None
