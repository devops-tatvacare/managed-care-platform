# Diabetes Program Seed from Doc — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a production-quality Diabetes Care Program in the DB from the clinical pathway doc, with 5 cohort tiers, composite risk scoring engine, tiebreaker rules, criteria per tier, and a linked pathway for Tier 2 — then validate in UI.

**Architecture:** Python seed script that uses existing SQLAlchemy models to insert program, cohorts, scoring engine, criteria trees, and a pathway. Runs once, idempotent (checks if program already exists).

**Tech Stack:** Python, SQLAlchemy async, SQLite

---

## File Map

### Backend (Create)
- `backend/app/services/diabetes_seed.py` — Complete seed script

### Backend (Modify)
- `backend/app/services/seed_service.py` — Call diabetes seed from main seed function (if it has one), or we run it standalone

---

## Task 1: Create Diabetes Program Seed Script

**Files:**
- Create: `backend/app/services/diabetes_seed.py`

The script creates:

### Program
- Name: "Diabetes Care"
- Condition: "Type 2 Diabetes Mellitus"
- Description: "5-tier risk stratification program based on ADA 2024 guidelines with composite risk scoring"
- Status: "published"

### 5 Cohorts (from doc Module 2)

| Tier | Name | Color | Score Range | Review Cadence | Gate Criteria |
|------|------|-------|-------------|----------------|---------------|
| 0 | Prevention Program | #86efac (green) | 0–15 | 365 days | BMI ≥ 25, no DM diagnosis, HbA1c 5.4-5.6% with risk factors |
| 1 | Pre-Diabetes Reversal | #93c5fd (blue) | 16–30 | 180 days | HbA1c 5.7–6.4% or FPG 100–125 |
| 2 | Diabetes Wellness | #fcd34d (yellow) | 31–50 | 90 days | T2DM diagnosis, HbA1c < 8.0% |
| 3 | Advanced Diabetes Care | #fdba74 (orange) | 51–70 | 30 days | T2DM diagnosis, any Tier 3 hard criterion |
| 4 | Comprehensive Diabetes Support | #fca5a5 (red) | 71–100 | 7 days | Any DM diagnosis, insulin/DKA/CKD 3b+ |

### Scoring Engine — Composite Risk Score (CRS, 0–100)

**5 Components (from doc):**

**A. Glycaemic Control (30%)**
- HbA1c < 5.7% → 0 pts
- HbA1c 5.7–6.4% → 20 pts
- HbA1c 6.5–7.9% → 40 pts
- HbA1c 8.0–9.9% → 70 pts
- HbA1c ≥ 10.0% → 90 pts
- Cap: 100

**B. Complication Burden (30%)**
- No complications → 0 pts
- Microalbuminuria → 25 pts
- Macroalbuminuria → 50 pts
- CKD G3a → 35 pts
- CKD G3b → 55 pts
- NPDR → 20 pts
- PDR → 45 pts
- Peripheral neuropathy → 20 pts
- Established CVD → 40 pts
- Heart failure → 40 pts
- Aggregation: sum (not max)
- Cap: 100

**C. Behavioural/Adherence (20%)**
- PDC ≥ 80% → 0 pts
- PDC 70–79% → 20 pts
- PDC 60–69% → 40 pts
- PDC < 60% → 70 pts
- Cap: 100

**D. Utilisation (10%)**
- 0 ER/hosp → 0 pts
- 1 DM ER visit → 30 pts
- 2+ DM ER visits → 60 pts
- 1 DM hospitalisation → 50 pts
- DKA hospitalisation → 85 pts
- 2+ hospitalisations → 80 pts
- Cap: 100

**E. SDOH Burden (10%)**
- 0 high-risk domains → 0 pts
- 1 domain → 33 pts
- 2 domains → 66 pts
- 3+ domains → 100 pts
- Cap: 100

### 6 Tiebreaker/Override Rules (from doc)

1. Priority 1: "Tier 3 hard criterion met → minimum Tier 3" → override_cohort
2. Priority 2: "T1DM (E10.x) → minimum Tier 3; CRS ≥ 51 → Tier 4" → override_cohort
3. Priority 3: "DKA event in prior 12 months → Tier 4" → override_cohort
4. Priority 4: "CRS Tier 0 but HbA1c ≥ 5.7% → escalate to Tier 1" → override_cohort
5. Priority 5: "HbA1c trajectory +5 sole reason → provisional, confirm in 45 days" → flag_review
6. Priority 6: "Clinical team manual override → document within 24 hours" → flag_review

### Criteria per Cohort (gate criteria)

Each cohort gets a criteria tree representing the hard clinical prerequisites from the doc.

---

## Task 2: Run Seed and Validate

- Run the seed script
- Verify in UI: navigate to Cohortisation → click the Diabetes Care program card → verify cohorts table, scoring table, override rules table all populated
- Run cohortisation to assign patients to the new program
