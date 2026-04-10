#!/usr/bin/env python3
"""Demo orchestration script — sets up data for each act of the Bradesco Care demo.

Usage:
    python scripts/demo.py act1          # Command Center KPIs + care gaps
    python scripts/demo.py act2          # AI Builder — generate diabetes stratification
    python scripts/demo.py act3          # Trigger real-time cohortisation + scoring
    python scripts/demo.py act4          # Pathway builder — create Tier 2 low-cost pathway
    python scripts/demo.py act5          # Fire comms — WhatsApp, SMS, survey pushes
    python scripts/demo.py act6          # Outcomes dashboard — tier migration data
    python scripts/demo.py reset         # Wipe demo state and re-seed clean
    python scripts/demo.py all           # Run acts 1-6 sequentially
    python scripts/demo.py --base-url http://localhost:8000 act3
"""

import argparse
import json
import sys
import time
import requests

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
BASE_URL = "http://localhost:8000"
EMAIL = "admin@tatvacare.in"
PASSWORD = "admin123"

# Demo persona — "Maria Oliveira", a Tier 3 patient we follow through the story
MARIA_EMPI = "EMPI-DEMO-MARIA"

# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

def login(base_url: str) -> str:
    r = requests.post(f"{base_url}/api/auth/login", json={"email": EMAIL, "password": PASSWORD})
    r.raise_for_status()
    return r.json()["access_token"]


def headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def get_program_id(base_url: str, h: dict) -> str | None:
    r = requests.get(f"{base_url}/api/programs", headers=h)
    r.raise_for_status()
    for p in r.json():
        if p["slug"] == "diabetes-care":
            return p["id"]
    return None


def get_cohorts(base_url: str, h: dict, program_id: str) -> list[dict]:
    r = requests.get(f"{base_url}/api/programs/{program_id}/cohorts", headers=h)
    r.raise_for_status()
    return r.json()


def find_patient_by_name(base_url: str, h: dict, search: str) -> dict | None:
    r = requests.get(f"{base_url}/api/patients", headers=h, params={"search": search, "page_size": 5})
    r.raise_for_status()
    items = r.json().get("items", [])
    return items[0] if items else None


def print_act(num: int, title: str):
    print(f"\n{'='*60}")
    print(f"  ACT {num}: {title}")
    print(f"{'='*60}\n")


def print_ok(msg: str):
    print(f"  [OK] {msg}")


def print_data(label: str, data):
    print(f"  {label}: {json.dumps(data, indent=2, default=str)}")

# ---------------------------------------------------------------------------
# ACT 1 — The Cost Problem (Command Center)
# ---------------------------------------------------------------------------

def act1(base_url: str, h: dict):
    print_act(1, "THE COST PROBLEM — Command Center KPIs")

    # Fetch KPIs
    r = requests.get(f"{base_url}/api/command-center/kpis", headers=h)
    r.raise_for_status()
    kpis = r.json()
    print_ok("Command Center KPIs loaded")
    print_data("KPIs", kpis)

    # Fetch action queue
    r = requests.get(f"{base_url}/api/command-center/action-queue", headers=h)
    r.raise_for_status()
    queue = r.json()
    print_ok(f"Action queue: {len(queue.get('items', []))} pending actions")

    # Fetch upcoming reviews
    r = requests.get(f"{base_url}/api/command-center/upcoming-reviews", headers=h)
    r.raise_for_status()
    reviews = r.json()
    print_ok(f"Upcoming reviews: {len(reviews.get('items', []))} due")

    # Fetch cohort distribution for diabetes program
    program_id = get_program_id(base_url, h)
    if program_id:
        r = requests.get(f"{base_url}/api/cohortisation/distribution/{program_id}", headers=h)
        r.raise_for_status()
        dist = r.json()
        print_ok("Cohort distribution:")
        for d in dist:
            print(f"    {d['cohort_name']}: {d['count']} members")

    print("\n  >> DEMO: Open /dashboard — KPIs, action queue, cohort distribution visible")
    print("  >> NARRATIVE: '50,000 lives on your book. 8% will drive 60% of claims.'")


# ---------------------------------------------------------------------------
# ACT 2 — AI Builds the Stratification Model
# ---------------------------------------------------------------------------

def act2(base_url: str, h: dict):
    print_act(2, "AI BUILDS THE STRATIFICATION MODEL")

    # Reset any existing builder session
    requests.post(
        f"{base_url}/api/ai/builder/reset",
        headers=h,
        params={"surface": "cohort_program"},
    )
    print_ok("Builder session reset")

    # Turn 1: Initial prompt — the demo money shot
    prompt = (
        "Build a 5-tier diabetes managed care program based on ADA 2024 guidelines. "
        "Use composite risk scoring (CRS 0-100) weighted: "
        "30% glycaemic control (HbA1c-based), "
        "30% complication burden (CKD, retinopathy, CVD, neuropathy), "
        "20% behavioural adherence (PDC, DDS, PHQ-9), "
        "10% utilisation (ER, hospitalisations, DKA), "
        "10% SDOH burden. "
        "Include HbA1c trajectory modifier (+/-5 for rising/declining on 2 consecutive labs). "
        "Tier thresholds: 0-15 Prevention, 16-30 Pre-Diabetes Reversal, 31-50 Diabetes Wellness, "
        "51-70 Advanced Care, 71-100 Comprehensive Support. "
        "Tie-breakers: T1DM→min Tier 3, DKA→Tier 4, HbA1c≥5.7% at Tier 0→escalate to Tier 1."
    )

    r = requests.post(
        f"{base_url}/api/ai/builder/turn",
        headers=h,
        json={"surface": "cohort_program", "message": prompt},
    )
    r.raise_for_status()
    result = r.json()
    print_ok(f"AI Builder Turn 1 complete (session: {result['session_id']})")
    print(f"  AI response preview: {result['message'][:200]}...")

    if result.get("config"):
        print_ok("Generated config includes:")
        config = result["config"]
        if "cohorts" in config:
            for c in config["cohorts"]:
                print(f"    {c.get('name', 'unnamed')}: CRS {c.get('score_range_min', '?')}-{c.get('score_range_max', '?')}")
        if "components" in config:
            for comp in config["components"]:
                print(f"    Scoring: {comp.get('name', '?')} — weight {comp.get('weight', '?')}%")

    print("\n  >> DEMO: Open /dashboard/cohortisation/builder — type the prompt, watch AI generate")
    print("  >> NARRATIVE: 'Clinical committee takes 3 months. AI drafts it in 30 seconds.'")


# ---------------------------------------------------------------------------
# ACT 3 — Score & Stratify in Real-Time
# ---------------------------------------------------------------------------

def act3(base_url: str, h: dict):
    print_act(3, "SCORE & STRATIFY IN REAL-TIME")

    program_id = get_program_id(base_url, h)
    if not program_id:
        print("  [ERROR] Diabetes Care program not found. Run act2 or check seed.")
        return

    # Get pre-scoring stats
    r = requests.get(f"{base_url}/api/cohortisation/dashboard", headers=h)
    r.raise_for_status()
    stats_before = r.json()
    print_ok(f"Before scoring: {stats_before.get('total_patients', 0)} patients, "
             f"{stats_before.get('unassigned', 0)} unassigned")

    # Trigger full recalculation
    r = requests.post(
        f"{base_url}/api/cohortisation/recalculate",
        headers=h,
        json={"scope": "all"},
    )
    r.raise_for_status()
    result = r.json()
    print_ok(f"Recalculation triggered: {result['events_created']} scoring events queued")

    # Wait a bit for the worker to process
    print("  Waiting for scoring worker to process...")
    time.sleep(3)

    # Get post-scoring stats
    r = requests.get(f"{base_url}/api/cohortisation/dashboard", headers=h)
    r.raise_for_status()
    stats_after = r.json()
    print_ok(f"After scoring: {stats_after.get('assigned', 0)} assigned, "
             f"{stats_after.get('unassigned', 0)} remaining")

    # Show distribution
    r = requests.get(f"{base_url}/api/cohortisation/distribution/{program_id}", headers=h)
    r.raise_for_status()
    dist = r.json()
    print_ok("Tier distribution after scoring:")
    for d in dist:
        print(f"    {d['cohort_name']}: {d['count']} members")

    # Show a sample Tier 3 assignment (the "Maria" moment)
    cohorts = get_cohorts(base_url, h, program_id)
    tier3 = next((c for c in cohorts if c.get("sort_order") == 3), None)
    if tier3:
        r = requests.get(
            f"{base_url}/api/cohortisation/assignments",
            headers=h,
            params={"cohort_id": tier3["id"], "page_size": 3},
        )
        r.raise_for_status()
        assignments = r.json()
        if assignments.get("items"):
            sample = assignments["items"][0]
            print_ok(f"Sample Tier 3 patient: {sample['patient_name']}")
            print(f"    CRS: {sample['score']}")
            if sample.get("score_breakdown"):
                print(f"    Breakdown: {json.dumps(sample['score_breakdown'], indent=6)}")

    print("\n  >> DEMO: Open /dashboard/cohortisation — trigger 'Recalculate All'")
    print("  >> DEMO: Watch SSE progress bar stream scores in real-time")
    print("  >> NARRATIVE: 'Every member scored against that model right now.'")


# ---------------------------------------------------------------------------
# ACT 4 — The Low-Cost Intervention Ladder (Pathway)
# ---------------------------------------------------------------------------

def act4(base_url: str, h: dict):
    print_act(4, "THE LOW-COST INTERVENTION LADDER — Pathway Builder")

    # Generate a pathway via AI
    r = requests.post(
        f"{base_url}/api/ai/pathway-generate",
        headers=h,
        json={
            "description": (
                "Type 2 Diabetes managed care pathway for Tier 2 (controlled diabetes). "
                "Focus on low-cost interventions: daily app nudges, quarterly pharmacist PDC check, "
                "quarterly RN care manager review, PCP only for prescribing. "
                "Include HbA1c rising check — if HbA1c crosses 8.0%, escalate to Tier 3. "
                "Add medication safety gating: check eGFR before Metformin dose increase or SGLT2i initiation. "
                "Include PHQ-9 quarterly screening with BH referral at score >= 10."
            ),
        },
    )
    r.raise_for_status()
    result = r.json()
    pathway = result.get("pathway", {})
    print_ok(f"AI generated pathway: {pathway.get('name', 'unnamed')}")
    print(f"  Blocks: {len(pathway.get('blocks', []))}")
    for block in pathway.get("blocks", []):
        print(f"    [{block['category']}] {block['label']}")
    print(f"  Edges: {len(pathway.get('edges', []))}")

    # 1. Create the pathway shell
    r = requests.post(
        f"{base_url}/api/pathways",
        headers=h,
        json={
            "name": pathway.get("name", "Diabetes Wellness Pathway — Demo"),
            "description": "Low-cost intervention ladder: digital first, escalate only when needed",
            "condition": "Type 2 Diabetes",
            "target_tiers": [2],
        },
    )
    if r.status_code not in (200, 201):
        print(f"  [WARN] Pathway create returned {r.status_code}: {r.text[:200]}")
        return
    pathway_id = r.json()["id"]
    print_ok(f"Pathway created (id: {pathway_id})")

    # 2. Add blocks one by one, track server-assigned IDs
    block_id_map: dict[int, str] = {}  # order_index -> server id
    for block in pathway.get("blocks", []):
        r = requests.post(
            f"{base_url}/api/pathways/{pathway_id}/blocks",
            headers=h,
            json={
                "block_type": block["block_type"],
                "category": block["category"],
                "label": block["label"],
                "config": block.get("config", {}),
                "order_index": block["order_index"],
                "position": {"x": 300, "y": block["order_index"] * 180},
            },
        )
        if r.status_code in (200, 201):
            block_id_map[block["order_index"]] = r.json()["id"]
            print_ok(f"  Block added: [{block['category']}] {block['label']}")
        else:
            print(f"  [WARN] Block failed: {r.status_code}: {r.text[:100]}")

    # 3. Save edges using the server-assigned block IDs
    edges_payload = []
    for edge in pathway.get("edges", []):
        src = block_id_map.get(edge["source_index"])
        tgt = block_id_map.get(edge["target_index"])
        if src and tgt:
            edges_payload.append({
                "id": str(__import__("uuid").uuid4()),
                "source_block_id": src,
                "target_block_id": tgt,
                "edge_type": edge.get("edge_type", "default"),
                "label": edge.get("label"),
            })

    if edges_payload:
        r = requests.put(
            f"{base_url}/api/pathways/{pathway_id}/edges",
            headers=h,
            json=edges_payload,
        )
        if r.status_code == 200:
            print_ok(f"  {len(edges_payload)} edges saved")
        else:
            print(f"  [WARN] Edges failed: {r.status_code}: {r.text[:100]}")

    print("\n  >> DEMO: Open /dashboard/pathways — show the visual canvas")
    print("  >> NARRATIVE: 'Tier 0 costs a lifestyle coach and an app. Tier 4 gets weekly care management.'")
    print("  >> NARRATIVE: 'The pathway keeps people in the cheap tiers.'")


# ---------------------------------------------------------------------------
# ACT 5 — Engage at Scale (Communications)
# ---------------------------------------------------------------------------

def act5(base_url: str, h: dict):
    print_act(5, "ENGAGE AT SCALE — Communications")

    program_id = get_program_id(base_url, h)

    # Get templates
    r = requests.get(f"{base_url}/api/communications/templates", headers=h)
    r.raise_for_status()
    templates = r.json().get("items", [])
    print_ok(f"Available templates: {len(templates)}")
    for t in templates[:5]:
        print(f"    [{t.get('channel', '?')}] {t.get('name', '?')}")

    # Find a Tier 3 patient to send comms to
    if program_id:
        cohorts = get_cohorts(base_url, h, program_id)
        tier3 = next((c for c in cohorts if c.get("sort_order") == 3), None)
        if tier3:
            r = requests.get(
                f"{base_url}/api/cohortisation/assignments",
                headers=h,
                params={"cohort_id": tier3["id"], "page_size": 5},
            )
            r.raise_for_status()
            tier3_patients = r.json().get("items", [])

            if tier3_patients:
                patient = tier3_patients[0]
                patient_id = patient["patient_id"]
                patient_name = patient["patient_name"]

                # Draft an AI-personalised message
                r = requests.post(
                    f"{base_url}/api/ai/comms-draft",
                    headers=h,
                    json={
                        "patient_id": patient_id,
                        "context": (
                            "Patient is in Tier 3 (Advanced Diabetes Care). "
                            "PDC has dropped below 80%. HbA1c trending up. "
                            "Send a medication adherence WhatsApp nudge in Portuguese."
                        ),
                    },
                )
                if r.status_code == 200:
                    draft = r.json()
                    print_ok(f"AI draft for {patient_name}:")
                    print(f"    \"{draft.get('draft', '(empty)')[:200]}\"")
                else:
                    print(f"  [WARN] AI draft failed: {r.status_code}")

                # Rewrite to empathetic tone
                r = requests.post(
                    f"{base_url}/api/ai/comms-rewrite",
                    headers=h,
                    json={
                        "text": "Your medication adherence (PDC) has dropped below 80%. Please resume your medications.",
                        "instruction": "Rewrite in empathetic, warm Portuguese. Address as 'voce'. Keep under 160 characters for SMS.",
                    },
                )
                if r.status_code == 200:
                    rewrite = r.json()
                    print_ok(f"AI rewrite (empathetic PT):")
                    print(f"    \"{rewrite.get('rewritten', '(empty)')[:200]}\"")
                else:
                    print(f"  [WARN] AI rewrite failed: {r.status_code}")

                # Send a WhatsApp action
                adherence_template = next(
                    (t for t in templates if "adherence" in t.get("name", "").lower()),
                    None,
                )
                r = requests.post(
                    f"{base_url}/api/communications/send",
                    headers=h,
                    json={
                        "patient_id": patient_id,
                        "channel": "whatsapp",
                        "action_type": "medication_adherence",
                        "template_id": adherence_template["id"] if adherence_template else None,
                        "payload": {"tone": "empathetic", "language": "pt"},
                    },
                )
                if r.status_code in (200, 201):
                    print_ok(f"WhatsApp sent to {patient_name}")
                else:
                    print(f"  [WARN] Send failed: {r.status_code}: {r.text[:100]}")

    # Send bulk comms to multiple Tier 3 patients for orchestration tab
    if program_id:
        cohorts = get_cohorts(base_url, h, program_id)
        for tier_order, channel, action_type in [
            (3, "whatsapp", "lab_reminder"),
            (3, "sms", "medication_adherence"),
            (2, "whatsapp", "wellness_check"),
            (1, "sms", "survey_push"),
            (1, "email", "enrollment_welcome"),
        ]:
            tier = next((c for c in cohorts if c.get("sort_order") == tier_order), None)
            if not tier:
                continue
            r = requests.get(
                f"{base_url}/api/cohortisation/assignments",
                headers=h,
                params={"cohort_id": tier["id"], "page_size": 10},
            )
            if r.status_code != 200:
                continue
            tier_patients = r.json().get("items", [])
            sent = 0
            for p in tier_patients:
                r = requests.post(
                    f"{base_url}/api/communications/send",
                    headers=h,
                    json={
                        "patient_id": p["patient_id"],
                        "channel": channel,
                        "action_type": action_type,
                        "payload": {"tone": "empathetic", "language": "pt"},
                    },
                )
                if r.status_code in (200, 201):
                    sent += 1
            if sent:
                print_ok(f"Sent {sent}x {channel}/{action_type} to Tier {tier_order} members")

    # Show orchestration stats
    r = requests.get(f"{base_url}/api/communications/orchestration", headers=h)
    r.raise_for_status()
    orch = r.json()
    print_ok(f"Orchestration: {orch.get('total', 0)} total actions")
    if orch.get("stats"):
        print_data("Stats", orch["stats"])

    print("\n  >> DEMO: Open /dashboard/communications")
    print("  >> DEMO: Show Threads tab (patient conversation), Orchestration tab (batch stats)")
    print("  >> NARRATIVE: '10,000 touchpoints tonight. Zero manual work.'")


# ---------------------------------------------------------------------------
# ACT 6 — Prove It (Outcomes)
# ---------------------------------------------------------------------------

def act6(base_url: str, h: dict):
    print_act(6, "PROVE IT — Outcomes Dashboard")

    program_id = get_program_id(base_url, h)
    if not program_id:
        print("  [ERROR] Diabetes Care program not found.")
        return

    # Step 1: Simulate data drift — worsen labs for some Tier 2 patients (push toward Tier 3)
    # and improve labs for some Tier 3 patients (pull toward Tier 2) to create migrations
    cohorts = get_cohorts(base_url, h, program_id)

    # Worsen Tier 2 → should migrate to Tier 3
    tier2 = next((c for c in cohorts if c.get("sort_order") == 2), None)
    if tier2:
        r = requests.get(
            f"{base_url}/api/cohortisation/assignments",
            headers=h,
            params={"cohort_id": tier2["id"], "page_size": 8},
        )
        if r.status_code == 200:
            for p in r.json().get("items", [])[:8]:
                requests.post(
                    f"{base_url}/api/patients/{p['patient_id']}/labs",
                    headers=h,
                    json={"test_type": "HbA1c", "value": 9.2, "unit": "%"},
                )
            print_ok("Injected worsening HbA1c (9.2%) for 8 Tier 2 patients")

    # Improve Tier 3 → should migrate to Tier 2
    tier3 = next((c for c in cohorts if c.get("sort_order") == 3), None)
    if tier3:
        r = requests.get(
            f"{base_url}/api/cohortisation/assignments",
            headers=h,
            params={"cohort_id": tier3["id"], "page_size": 8},
        )
        if r.status_code == 200:
            for p in r.json().get("items", [])[:8]:
                requests.post(
                    f"{base_url}/api/patients/{p['patient_id']}/labs",
                    headers=h,
                    json={"test_type": "HbA1c", "value": 6.8, "unit": "%"},
                )
            print_ok("Injected improving HbA1c (6.8%) for 8 Tier 3 patients")

    # Step 2: Re-score to pick up the new labs → creates tier migrations
    print("  Triggering re-cohortisation...")
    r = requests.post(
        f"{base_url}/api/cohortisation/recalculate",
        headers=h,
        json={"scope": "all"},
    )
    if r.status_code == 200:
        count = r.json().get("events_created", 0)
        print_ok(f"Re-cohortisation queued: {count} events")
        print("  Waiting for scoring...")
        time.sleep(6)
    else:
        print(f"  [WARN] Recalculate: {r.status_code}")

    # Step 2: Take a snapshot
    r = requests.post(
        f"{base_url}/api/outcomes/snapshots",
        headers=h,
        params={"program_id": program_id},
    )
    if r.status_code in (200, 201):
        print_ok("Outcomes snapshot captured")
    else:
        print(f"  [INFO] Snapshot: {r.status_code}")

    # Step 3: Fetch outcomes tabs (all need program_id)
    for tab in ["clinical", "hedis", "engagement", "financial"]:
        r = requests.get(
            f"{base_url}/api/outcomes/{tab}",
            headers=h,
            params={"program_id": program_id},
        )
        if r.status_code == 200:
            data = r.json()
            metrics = data.get("metrics", [])
            print_ok(f"{tab.title()}: {len(metrics)} metrics")
            for m in metrics[:3]:
                print(f"    {m.get('label', '?')}: {m.get('value', '?')}")
        else:
            print(f"  [INFO] {tab}: {r.status_code}")

    # Step 4: Migration summary
    r = requests.get(
        f"{base_url}/api/outcomes/migrations/summary",
        headers=h,
        params={"program_id": program_id},
    )
    if r.status_code == 200:
        migration = r.json()
        print_ok("Migration summary:")
        print_data("Migrations", migration)
    else:
        print(f"  [INFO] Migration summary: {r.status_code}")

    r = requests.get(
        f"{base_url}/api/outcomes/migrations/history",
        headers=h,
        params={"program_id": program_id, "page_size": 10},
    )
    if r.status_code == 200:
        history = r.json()
        items = history.get("items", [])
        print_ok(f"Migration history: {len(items)} recent moves")
        for m in items[:5]:
            print(f"    {m.get('patient_name', '?')}: {m.get('from_cohort', '?')} → {m.get('to_cohort', '?')}")
    else:
        print(f"  [INFO] Migration history: {r.status_code}")

    # Step 5: Quarterly AI insight
    r = requests.post(
        f"{base_url}/api/outcomes/quarterly-insight",
        headers=h,
        params={"program_id": program_id},
    )
    if r.status_code == 200:
        insight = r.json()
        print_ok("AI quarterly insight generated")
        print(f"    {insight.get('insight', '(empty)')[:200]}...")
    else:
        print(f"  [INFO] Quarterly insight: {r.status_code}")

    print("\n  >> DEMO: Open /dashboard/outcomes")
    print("  >> DEMO: Show Clinical tab, HEDIS tab, Re-cohortisation tab")
    print("  >> NARRATIVE: 'Tier 3→2 migration up 18%. Three fewer DKA hospitalisations = R$450K saved.'")


# ---------------------------------------------------------------------------
# RESET — Clean demo state
# ---------------------------------------------------------------------------

def reset(base_url: str, h: dict):
    print_act(0, "RESET — Cleaning demo state")

    # Reset AI builder sessions
    for surface in ["cohort_program", "pathway"]:
        r = requests.post(
            f"{base_url}/api/ai/builder/reset",
            headers=h,
            params={"surface": surface},
        )
        if r.status_code == 200:
            print_ok(f"AI builder session reset: {surface}")

    # Re-trigger cohortisation from scratch
    r = requests.post(
        f"{base_url}/api/cohortisation/recalculate",
        headers=h,
        json={"scope": "all"},
    )
    if r.status_code == 200:
        result = r.json()
        print_ok(f"Re-cohortisation queued: {result['events_created']} events")

    print("\n  Done. Backend seed data is unchanged — only AI sessions and scores refreshed.")
    print("  For a full DB reset, restart the backend: docker-compose down -v && docker-compose up")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Demo orchestration for Bradesco Care Admin")
    parser.add_argument("act", choices=["act1", "act2", "act3", "act4", "act5", "act6", "reset", "all"],
                        help="Which act to set up")
    parser.add_argument("--base-url", default=BASE_URL, help=f"Backend URL (default: {BASE_URL})")
    args = parser.parse_args()

    print(f"Connecting to {args.base_url}...")
    try:
        token = login(args.base_url)
    except requests.exceptions.ConnectionError:
        print(f"[ERROR] Cannot connect to {args.base_url}. Is the backend running?")
        sys.exit(1)
    except requests.exceptions.HTTPError as e:
        print(f"[ERROR] Login failed: {e}")
        sys.exit(1)

    print_ok("Authenticated")
    h = headers(token)

    acts = {
        "act1": act1,
        "act2": act2,
        "act3": act3,
        "act4": act4,
        "act5": act5,
        "act6": act6,
        "reset": reset,
    }

    if args.act == "all":
        for name in ["act1", "act2", "act3", "act4", "act5", "act6"]:
            acts[name](args.base_url, h)
    else:
        acts[args.act](args.base_url, h)

    print(f"\n{'='*60}")
    print("  DONE")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
