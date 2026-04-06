import uuid
from dataclasses import dataclass


@dataclass(frozen=True)
class AuthContext:
    user_id: uuid.UUID
    tenant_id: uuid.UUID
    email: str
    role_name: str
    is_owner: bool
    permissions: frozenset[str]
