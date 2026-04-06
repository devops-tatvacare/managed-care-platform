import random
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.pathway import Pathway, PathwayBlock, PathwayEdge
from app.services.seed_service import DEFAULT_TENANT_ID, DEFAULT_USER_ID


async def seed_pathways(db: AsyncSession) -> None:
    result = await db.execute(
        select(func.count()).select_from(Pathway).where(Pathway.tenant_id == DEFAULT_TENANT_ID)
    )
    if result.scalar_one() > 0:
        return

    random.seed(43)
    admin_id = DEFAULT_USER_ID
    now = datetime.now(timezone.utc)

    # ── Pathway 1: Comprehensive Diabetes Support ──────────────────────
    pw1 = Pathway(
        id=uuid.uuid4(),
        tenant_id=DEFAULT_TENANT_ID,
        created_by=admin_id,
        name="Comprehensive Diabetes Support",
        description="End-to-end care pathway for Tier 2-4 T2DM patients including enrollment, monitoring, and escalation.",
        condition="diabetes",
        target_tiers=[2, 3, 4],
        status="published",
        version=1,
        published_at=now - timedelta(days=30),
        published_by=admin_id,
    )
    db.add(pw1)
    await db.flush()

    pw1_blocks = [
        PathwayBlock(
            id=uuid.uuid4(),
            tenant_id=DEFAULT_TENANT_ID,
            pathway_id=pw1.id,
            block_type="eligibility_diagnosis",
            category="eligibility",
            label="T2DM Diagnosis Check",
            config={"icd10_codes": ["E11"], "match_type": "prefix", "include": True},
            position={"x": 400, "y": 0},
            order_index=0,
        ),
        PathwayBlock(
            id=uuid.uuid4(),
            tenant_id=DEFAULT_TENANT_ID,
            pathway_id=pw1.id,
            block_type="eligibility_lab",
            category="eligibility",
            label="HbA1c \u2265 7.0%",
            config={"test_type": "hba1c", "operator": "gte", "value": 7.0, "unit": "%", "missing_data_rule": "use_fpg_substitute"},
            position={"x": 400, "y": 150},
            order_index=1,
        ),
        PathwayBlock(
            id=uuid.uuid4(),
            tenant_id=DEFAULT_TENANT_ID,
            pathway_id=pw1.id,
            block_type="action_outreach",
            category="action",
            label="Enrollment Contact",
            config={"channel": "whatsapp", "template_slug": "enrollment_intro", "ai_personalisation": True, "escalation_action": "assign_care_manager"},
            position={"x": 400, "y": 300},
            order_index=2,
        ),
        PathwayBlock(
            id=uuid.uuid4(),
            tenant_id=DEFAULT_TENANT_ID,
            pathway_id=pw1.id,
            block_type="action_lab_order",
            category="action",
            label="Quarterly HbA1c",
            config={"test_type": "hba1c", "frequency": "quarterly", "notification_target": "care_manager"},
            position={"x": 400, "y": 450},
            order_index=3,
        ),
        PathwayBlock(
            id=uuid.uuid4(),
            tenant_id=DEFAULT_TENANT_ID,
            pathway_id=pw1.id,
            block_type="logic_conditional",
            category="logic",
            label="Severe Hyperglycemia Gate",
            config={"field": "hba1c", "operator": "gt", "value": "10", "true_branch_label": "Escalate to Tier 4", "false_branch_label": "Continue Protocol"},
            position={"x": 400, "y": 600},
            order_index=4,
        ),
        PathwayBlock(
            id=uuid.uuid4(),
            tenant_id=DEFAULT_TENANT_ID,
            pathway_id=pw1.id,
            block_type="escalation_uptier",
            category="escalation",
            label="Escalate to Tier 4",
            config={"target_tier": 4, "timing": "within_48h", "notification_targets": ["care_manager", "physician"]},
            position={"x": 400, "y": 750},
            order_index=5,
        ),
    ]
    db.add_all(pw1_blocks)
    await db.flush()

    pw1_edges = [
        PathwayEdge(id=uuid.uuid4(), pathway_id=pw1.id, source_block_id=pw1_blocks[0].id, target_block_id=pw1_blocks[1].id, edge_type="default"),
        PathwayEdge(id=uuid.uuid4(), pathway_id=pw1.id, source_block_id=pw1_blocks[1].id, target_block_id=pw1_blocks[2].id, edge_type="default"),
        PathwayEdge(id=uuid.uuid4(), pathway_id=pw1.id, source_block_id=pw1_blocks[2].id, target_block_id=pw1_blocks[3].id, edge_type="default"),
        PathwayEdge(id=uuid.uuid4(), pathway_id=pw1.id, source_block_id=pw1_blocks[3].id, target_block_id=pw1_blocks[4].id, edge_type="default"),
        PathwayEdge(id=uuid.uuid4(), pathway_id=pw1.id, source_block_id=pw1_blocks[4].id, target_block_id=pw1_blocks[5].id, edge_type="true_branch", label="HbA1c > 10"),
    ]
    db.add_all(pw1_edges)

    # ── Pathway 2: Diabetes Prevention -- Tier 0 ──────────────────────
    pw2 = Pathway(
        id=uuid.uuid4(),
        tenant_id=DEFAULT_TENANT_ID,
        created_by=admin_id,
        name="Diabetes Prevention \u2014 Tier 0",
        description="Screening and lifestyle coaching pathway for at-risk individuals not yet diagnosed with diabetes.",
        condition="diabetes",
        target_tiers=[0],
        status="published",
        version=1,
        published_at=now - timedelta(days=15),
        published_by=admin_id,
    )
    db.add(pw2)
    await db.flush()

    pw2_blocks = [
        PathwayBlock(
            id=uuid.uuid4(),
            tenant_id=DEFAULT_TENANT_ID,
            pathway_id=pw2.id,
            block_type="eligibility_demographics",
            category="eligibility",
            label="At-Risk Demographics",
            config={"age_min": 18, "age_max": 80, "bmi_threshold": 25, "bmi_operator": "gte", "gender": None},
            position={"x": 400, "y": 0},
            order_index=0,
        ),
        PathwayBlock(
            id=uuid.uuid4(),
            tenant_id=DEFAULT_TENANT_ID,
            pathway_id=pw2.id,
            block_type="eligibility_lab",
            category="eligibility",
            label="Pre-Diabetes HbA1c",
            config={"test_type": "hba1c", "operator": "between", "value": 5.7, "value_upper": 6.4, "unit": "%"},
            position={"x": 400, "y": 150},
            order_index=1,
        ),
        PathwayBlock(
            id=uuid.uuid4(),
            tenant_id=DEFAULT_TENANT_ID,
            pathway_id=pw2.id,
            block_type="action_assessment",
            category="action",
            label="Diabetes Distress Screen",
            config={"instrument": "dds", "frequency": "quarterly", "action_threshold": 3.0},
            position={"x": 400, "y": 300},
            order_index=2,
        ),
        PathwayBlock(
            id=uuid.uuid4(),
            tenant_id=DEFAULT_TENANT_ID,
            pathway_id=pw2.id,
            block_type="schedule_recurring",
            category="schedule",
            label="Quarterly Check-in",
            config={"cadence": "quarterly", "touchpoint_type": "coach_call", "role": "lifestyle_coach", "channel": "video"},
            position={"x": 400, "y": 450},
            order_index=3,
        ),
    ]
    db.add_all(pw2_blocks)
    await db.flush()

    pw2_edges = [
        PathwayEdge(id=uuid.uuid4(), pathway_id=pw2.id, source_block_id=pw2_blocks[0].id, target_block_id=pw2_blocks[1].id, edge_type="default"),
        PathwayEdge(id=uuid.uuid4(), pathway_id=pw2.id, source_block_id=pw2_blocks[1].id, target_block_id=pw2_blocks[2].id, edge_type="default"),
        PathwayEdge(id=uuid.uuid4(), pathway_id=pw2.id, source_block_id=pw2_blocks[2].id, target_block_id=pw2_blocks[3].id, edge_type="default"),
    ]
    db.add_all(pw2_edges)

    # ── Pathway 3: Heart Failure Comorbidity ──────────────────────────
    pw3 = Pathway(
        id=uuid.uuid4(),
        tenant_id=DEFAULT_TENANT_ID,
        created_by=admin_id,
        name="Heart Failure Comorbidity",
        description="Draft pathway for managing heart failure comorbidity in Tier 3-4 diabetes patients.",
        condition="heart_failure",
        target_tiers=[3, 4],
        status="draft",
        version=1,
    )
    db.add(pw3)
    await db.flush()

    pw3_blocks = [
        PathwayBlock(
            id=uuid.uuid4(),
            tenant_id=DEFAULT_TENANT_ID,
            pathway_id=pw3.id,
            block_type="eligibility_diagnosis",
            category="eligibility",
            label="Heart Failure Diagnosis",
            config={"icd10_codes": ["I50"], "match_type": "prefix", "include": True},
            position={"x": 400, "y": 0},
            order_index=0,
        ),
        PathwayBlock(
            id=uuid.uuid4(),
            tenant_id=DEFAULT_TENANT_ID,
            pathway_id=pw3.id,
            block_type="action_referral",
            category="action",
            label="Cardiology Referral",
            config={"specialty": "cardiology", "urgency": "standard", "prerequisite_data": ["echocardiogram", "bnp_level"]},
            position={"x": 400, "y": 150},
            order_index=1,
        ),
        PathwayBlock(
            id=uuid.uuid4(),
            tenant_id=DEFAULT_TENANT_ID,
            pathway_id=pw3.id,
            block_type="schedule_recurring",
            category="schedule",
            label="Monthly Cardiology Review",
            config={"cadence": "monthly", "touchpoint_type": "clinical_review", "role": "cardiologist", "channel": "telehealth"},
            position={"x": 400, "y": 300},
            order_index=2,
        ),
    ]
    db.add_all(pw3_blocks)
    await db.flush()

    pw3_edges = [
        PathwayEdge(id=uuid.uuid4(), pathway_id=pw3.id, source_block_id=pw3_blocks[0].id, target_block_id=pw3_blocks[1].id, edge_type="default"),
        PathwayEdge(id=uuid.uuid4(), pathway_id=pw3.id, source_block_id=pw3_blocks[1].id, target_block_id=pw3_blocks[2].id, edge_type="default"),
    ]
    db.add_all(pw3_edges)

    await db.commit()
