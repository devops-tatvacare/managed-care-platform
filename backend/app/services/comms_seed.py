"""Seed data for communications — 8 message templates + 30-50 concierge actions."""

from __future__ import annotations

import random
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.communication import ConciergeAction, MessageTemplate
from app.models.patient import Patient
from app.services.seed_service import DEFAULT_TENANT_ID

TEMPLATE_SEEDS = [
    {
        "name": "Enrollment Welcome",
        "slug": "enrollment_welcome",
        "category": "followup",
        "channel": "whatsapp",
        "language": "pt",
        "content": (
            "Olá {{patient_name}}, bem-vindo(a) ao programa de acompanhamento da Bradesco Saúde! "
            "Estamos aqui para apoiá-lo(a) na sua jornada de saúde. "
            "Você pode nos contatar a qualquer momento por este canal. "
            "Seu próximo passo é agendar uma consulta de avaliação inicial."
        ),
        "variable_map": {"patient_name": "first_name"},
    },
    {
        "name": "HbA1c Lab Reminder",
        "slug": "hba1c_lab_reminder",
        "category": "lab_reminder",
        "channel": "whatsapp",
        "language": "pt",
        "content": (
            "Olá {{patient_name}}, este é um lembrete para realizar seu exame de HbA1c. "
            "Este exame é fundamental para monitorar o controle do seu diabetes. "
            "Por favor, agende a coleta em um dos laboratórios credenciados."
        ),
        "variable_map": {"patient_name": "first_name"},
    },
    {
        "name": "Medication Adherence Check-in",
        "slug": "medication_adherence",
        "category": "medication",
        "channel": "whatsapp",
        "language": "pt",
        "content": (
            "Olá {{patient_name}}, como está indo com sua medicação? "
            "Sabemos que manter a rotina pode ser desafiador. "
            "Se tiver dúvidas sobre seus medicamentos ({{medications}}), estamos à disposição para ajudar."
        ),
        "variable_map": {"patient_name": "first_name", "medications": "active_medications"},
    },
    {
        "name": "Appointment Reminder",
        "slug": "appointment_reminder",
        "category": "appointment",
        "channel": "sms",
        "language": "pt",
        "content": (
            "Lembrete: {{patient_name}}, você tem uma consulta agendada. "
            "Por favor, confirme sua presença respondendo SIM ou entre em contato para reagendar."
        ),
        "variable_map": {"patient_name": "first_name"},
    },
    {
        "name": "Care Gap Alert",
        "slug": "care_gap_alert",
        "category": "followup",
        "channel": "whatsapp",
        "language": "pt",
        "content": (
            "Olá {{patient_name}}, identificamos que você possui exames ou consultas pendentes: {{care_gaps}}. "
            "Manter seus exames em dia é essencial para seu acompanhamento. "
            "Podemos ajudá-lo(a) a agendar?"
        ),
        "variable_map": {"patient_name": "first_name", "care_gaps": "care_gaps"},
    },
    {
        "name": "Post-Hospitalization Follow-up",
        "slug": "post_hospitalization",
        "category": "followup",
        "channel": "whatsapp",
        "language": "pt",
        "content": (
            "Olá {{patient_name}}, esperamos que esteja se recuperando bem. "
            "Após sua internação, é muito importante manter o acompanhamento médico. "
            "Sua equipe de cuidado está disponível para apoiá-lo(a). "
            "Vamos agendar uma consulta de retorno?"
        ),
        "variable_map": {"patient_name": "first_name"},
    },
    {
        "name": "Annual Wellness Visit",
        "slug": "annual_wellness",
        "category": "appointment",
        "channel": "sms",
        "language": "pt",
        "content": (
            "{{patient_name}}, está na hora do seu check-up anual! "
            "Agende sua consulta de avaliação preventiva. "
            "A prevenção é o melhor caminho para uma vida saudável."
        ),
        "variable_map": {"patient_name": "first_name"},
    },
    {
        "name": "Escalation to Care Manager",
        "slug": "escalation_care_manager",
        "category": "custom",
        "channel": "system",
        "language": "pt",
        "content": (
            "ALERTA: Paciente {{patient_name}} requer atenção prioritária. "
            "Motivo: indicadores fora dos limites esperados. "
            "Por favor, revise o perfil do paciente e entre em contato nas próximas 48 horas."
        ),
        "variable_map": {"patient_name": "first_name"},
    },
]

# Action types for each channel
CHANNEL_ACTION_TYPES = {
    "whatsapp": ["wa_dispatched", "wa_delivered", "wa_read", "wa_replied"],
    "sms": ["sms_dispatched", "sms_delivered"],
    "call": ["call_initiated", "call_completed", "call_no_answer"],
    "app_push": ["push_sent", "push_opened"],
    "system": ["system_alert_created"],
}

CHANNELS = ["whatsapp", "sms", "call", "app_push"]


async def seed_comms(db: AsyncSession) -> None:
    """Seed 8 message templates and 30-50 concierge actions."""

    # Check if already seeded
    existing = (await db.execute(
        select(MessageTemplate).where(MessageTemplate.tenant_id == DEFAULT_TENANT_ID).limit(1)
    )).scalar_one_or_none()
    if existing:
        return

    # Seed templates
    template_ids = []
    for seed in TEMPLATE_SEEDS:
        tpl = MessageTemplate(tenant_id=DEFAULT_TENANT_ID, **seed)
        db.add(tpl)
        template_ids.append(tpl.id)

    await db.flush()

    # Get 20 patients for actions (need names for template resolution)
    result = await db.execute(
        select(Patient)
        .where(Patient.tenant_id == DEFAULT_TENANT_ID, Patient.is_active == True)  # noqa: E712
        .limit(20)
    )
    patients = list(result.scalars().all())
    patient_ids = [p.id for p in patients]
    patient_map = {p.id: p for p in patients}

    if not patient_ids:
        await db.commit()
        return

    # Seed 40 concierge actions across 15-20 patients
    now = datetime.now(timezone.utc)
    actions_to_add = []

    # Action types that carry a message payload (the "dispatched"/"sent" step)
    MESSAGE_ACTION_TYPES = {"wa_dispatched", "sms_dispatched", "push_sent"}

    def resolve_template(tpl_content: str, patient: Patient) -> str:
        """Replace {{variable}} placeholders with real patient data."""
        text = tpl_content
        text = text.replace("{{patient_name}}", patient.first_name)
        meds = patient.active_medications or []
        med_names = ", ".join(m["name"] for m in meds[:3]) if meds else "seus medicamentos"
        text = text.replace("{{medications}}", med_names)
        gaps = patient.care_gaps or []
        gap_text = ", ".join(gaps[:3]) if gaps else "exames de rotina"
        text = text.replace("{{care_gaps}}", gap_text)
        return text

    # Build resolved message pool per patient
    def get_message(patient: Patient) -> str:
        tpl = random.choice(TEMPLATE_SEEDS)
        return resolve_template(tpl["content"], patient)

    for i in range(40):
        patient_id = random.choice(patient_ids[:min(len(patient_ids), 18)])
        patient = patient_map[patient_id]
        channel = random.choice(CHANNELS)
        action_types = CHANNEL_ACTION_TYPES[channel]
        triggered_by = random.choice(["auto", "auto", "auto", "manual"])  # 75% auto

        # Create a sequence of 1-3 actions for some patients (multi-step)
        num_steps = random.choice([1, 1, 1, 2, 2, 3])
        base_time = now - timedelta(days=random.randint(0, 30), hours=random.randint(0, 23))

        for step in range(min(num_steps, len(action_types))):
            action_type = action_types[step]

            # Determine status based on position in sequence
            if step == len(action_types) - 1 or step == num_steps - 1:
                status = random.choice(["success", "success", "success", "failed"])
            else:
                status = "success"

            completed_at = None
            if status in ("success", "failed"):
                completed_at = base_time + timedelta(minutes=random.randint(1, 120))

            # Only dispatched/sent actions carry a message payload
            payload = None
            if action_type in MESSAGE_ACTION_TYPES:
                payload = {"message": get_message(patient)}

            action = ConciergeAction(
                tenant_id=DEFAULT_TENANT_ID,
                patient_id=patient_id,
                triggered_by=triggered_by,
                channel=channel,
                action_type=action_type,
                status=status,
                template_id=random.choice(template_ids) if action_type in MESSAGE_ACTION_TYPES else None,
                payload=payload,
                response={"delivery_id": str(uuid.uuid4())[:8]} if status == "success" else None,
                error="Delivery failed: recipient unavailable" if status == "failed" else None,
                created_at=base_time + timedelta(minutes=step * 15),
                completed_at=completed_at,
            )
            actions_to_add.append(action)

            if len(actions_to_add) >= 50:
                break
        if len(actions_to_add) >= 50:
            break

    db.add_all(actions_to_add)
    await db.commit()
