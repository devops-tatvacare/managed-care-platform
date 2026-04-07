import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.permission_catalog import ALL_PERMISSIONS
from app.models.role import Role
from app.models.tenant import Tenant, TenantConfig
from app.models.user import User
from app.services.auth_service import hash_password

SYSTEM_TENANT_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")
DEFAULT_TENANT_ID = uuid.UUID("10000000-0000-0000-0000-000000000001")
DEFAULT_USER_ID = uuid.UUID("20000000-0000-0000-0000-000000000001")
OWNER_ROLE_ID = uuid.UUID("30000000-0000-0000-0000-000000000001")
CARE_MANAGER_ROLE_ID = uuid.UUID("30000000-0000-0000-0000-000000000002")
ARCHITECT_ROLE_ID = uuid.UUID("30000000-0000-0000-0000-000000000003")


async def seed_all(db: AsyncSession) -> None:
    result = await db.execute(select(Tenant).where(Tenant.id == DEFAULT_TENANT_ID))
    if result.scalar_one_or_none():
        return

    tenant = Tenant(id=DEFAULT_TENANT_ID, name="Bradesco Saude", slug="bradesco-saude")
    db.add(tenant)

    config = TenantConfig(tenant_id=DEFAULT_TENANT_ID, llm_provider="gemini")
    db.add(config)

    owner_role = Role(
        id=OWNER_ROLE_ID,
        tenant_id=DEFAULT_TENANT_ID,
        name="Owner",
        description="Full system access",
        is_system=True,
        permissions=ALL_PERMISSIONS,
    )
    care_manager_role = Role(
        id=CARE_MANAGER_ROLE_ID,
        tenant_id=DEFAULT_TENANT_ID,
        name="Care Manager",
        description="Patient care and communications",
        is_system=False,
        permissions=[
            "patient:read", "patient:write", "pathway:read",
            "cohort:read", "communication:read", "communication:write",
            "outcome:read", "ai:use",
        ],
    )
    architect_role = Role(
        id=ARCHITECT_ROLE_ID,
        tenant_id=DEFAULT_TENANT_ID,
        name="Program Architect",
        description="Pathway design and cohortisation",
        is_system=False,
        permissions=[
            "patient:read", "pathway:read", "pathway:write", "pathway:publish",
            "cohort:read", "cohort:write", "outcome:read", "ai:use", "config:edit",
        ],
    )
    db.add_all([owner_role, care_manager_role, architect_role])

    admin = User(
        id=DEFAULT_USER_ID,
        tenant_id=DEFAULT_TENANT_ID,
        email="admin@bradesco.com",
        password_hash=hash_password("admin123"),
        display_name="Admin User",
        role_id=OWNER_ROLE_ID,
    )
    db.add(admin)

    await db.commit()

    from app.services.patient_seed import seed_patients
    await seed_patients(db)

    from app.services.pathway_seed import seed_pathways
    await seed_pathways(db)

    from app.services.cohort_seed import seed_diabetes_program
    await seed_diabetes_program(db)

    # Emit events for initial cohortisation
    from app.workers.event_emitter import emit_bulk_events
    from app.models.patient import Patient
    result = await db.execute(select(Patient.id).where(Patient.tenant_id == DEFAULT_TENANT_ID))
    patient_ids = [row[0] for row in result.all()]
    await emit_bulk_events(db, DEFAULT_TENANT_ID, patient_ids, "initial_seed")
    await db.commit()
