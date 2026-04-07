"""Template service — CRUD for MessageTemplate + variable rendering."""

from __future__ import annotations

import re
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.communication import MessageTemplate
from app.models.patient import Patient

_VAR_RE = re.compile(r"\{\{(\w+)\}\}")


async def list_templates(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    *,
    category: str | None = None,
    channel: str | None = None,
    language: str | None = None,
) -> list[MessageTemplate]:
    q = select(MessageTemplate).where(MessageTemplate.tenant_id == tenant_id)
    if category:
        q = q.where(MessageTemplate.category == category)
    if channel:
        q = q.where(MessageTemplate.channel == channel)
    if language:
        q = q.where(MessageTemplate.language == language)
    q = q.order_by(MessageTemplate.category, MessageTemplate.name)
    return list((await db.execute(q)).scalars().all())


async def get_template(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    template_id: uuid.UUID,
) -> MessageTemplate | None:
    q = select(MessageTemplate).where(
        MessageTemplate.id == template_id,
        MessageTemplate.tenant_id == tenant_id,
    )
    return (await db.execute(q)).scalar_one_or_none()


async def create_template(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    data: dict,
) -> MessageTemplate:
    tpl = MessageTemplate(tenant_id=tenant_id, **data)
    db.add(tpl)
    await db.commit()
    await db.refresh(tpl)
    return tpl


async def update_template(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    template_id: uuid.UUID,
    data: dict,
) -> MessageTemplate | None:
    tpl = await get_template(db, tenant_id, template_id)
    if not tpl:
        return None
    for key, value in data.items():
        if value is not None:
            setattr(tpl, key, value)
    await db.commit()
    await db.refresh(tpl)
    return tpl


def render_template(template: MessageTemplate, patient: Patient) -> str:
    """Fill {{variable}} placeholders from patient data using variable_map."""
    content = template.content
    var_map = template.variable_map or {}

    def _resolve(match: re.Match) -> str:
        var_name = match.group(1)
        field = var_map.get(var_name, var_name)
        value = getattr(patient, field, None)
        if value is None:
            return f"{{{{{var_name}}}}}"
        if isinstance(value, list):
            return ", ".join(str(v) for v in value)
        return str(value)

    return _VAR_RE.sub(_resolve, content)
