# Fix FastAPI startup: install `email-validator` for Pydantic `EmailStr`

## TL;DR
> **Summary**: Backend fails to boot because `pydantic.EmailStr` requires the optional `email-validator` package; install it in the venv and add it to `backend/requirements.txt` so `pip install -r requirements.txt` is reproducible.
> **Deliverables**:
> - Backend boots successfully with `uvicorn main:app --reload`
> - `backend/requirements.txt` updated to include `email-validator`
> **Effort**: Quick
> **Parallel**: NO
> **Critical Path**: Add dependency → install in venv → boot + `/health`

## Context
### Original Request
- Running `uvicorn main:app --reload --host 0.0.0.0 --port 8000` crashes with:
  - `ImportError: email-validator is not installed, run \`pip install 'pydantic[email]'\``

### Repo + System Findings (grounded)
- `backend/schemas/auth.py` uses `EmailStr` for `RegisterRequest.email` + `LoginRequest.email`.
- `backend/requirements.txt` includes `pydantic` but not `email-validator`.
- Current venv Python: 3.13.7.

### Metis Review (gaps addressed)
- Ensure fix is reproducible from a fresh venv (dependency recorded in requirements).
- Avoid broad dependency upgrades; keep change minimal.
- Treat Python version standardization as optional (not required to unblock startup).

## Work Objectives
### Core Objective
- Make backend start successfully without ImportError.

### Deliverables
- `backend/requirements.txt` contains `email-validator`.
- A clean venv can install requirements and start `uvicorn`.

### Definition of Done (verifiable)
- [x] `backend\venv\Scripts\python -c "import email_validator"` exits 0
- [x] `backend\venv\Scripts\python -c "from schemas.auth import RegisterRequest; RegisterRequest(email='a@connect.ust.hk', password='12345678')"` exits 0
- [x] `backend\venv\Scripts\python -c "from schemas.auth import RegisterRequest; RegisterRequest(email='a@gmail.com', password='12345678')"` fails with validation error containing `Only @connect.ust.hk emails are allowed`
- [x] `uvicorn main:app --reload --host 0.0.0.0 --port 8000` starts without stacktrace
- [x] `curl http://localhost:8000/health` returns `{"status":"ok"}`

### Must NOT Have (guardrails)
- MUST NOT change schema types to bypass validation (e.g., replacing `EmailStr` with `str`).
- MUST NOT add unrelated dependencies or upgrade the full dependency set.
- MUST NOT introduce any test frameworks (none configured).

## Verification Strategy
- No formal test framework.
- Verification via import checks + running uvicorn + calling `/health`.
- Evidence: save outputs to `.sisyphus/evidence/task-{N}-{slug}.txt`.

## Execution Strategy
### Parallel Execution Waves
Wave 1 (Fix + reproducibility): Tasks 1–2
Wave 2 (Boot verification): Task 3
Optional Wave (Python baseline alignment): Task 4

## TODOs

- [x] 1. Add `email-validator` to backend requirements

  **What to do**:
  - Edit `backend/requirements.txt` and add a new line:
    - `email-validator>=2.0.0`
  - Keep the file otherwise unchanged.

  **Must NOT do**:
  - Do not bump existing package versions.

  **Recommended Agent Profile**:
  - Category: `quick` — Reason: single-file change
  - Skills: []

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: [2,3] | Blocked By: []

  **References**:
  - Code: `backend/schemas/auth.py` — uses `EmailStr`
  - Error: runtime ImportError suggests `pydantic[email]`

  **Acceptance Criteria**:
  - [x] `backend/requirements.txt` contains `email-validator>=2.0.0`

  **QA Scenarios**:
  ```
  Scenario: Requirements include EmailStr dependency
    Tool: Bash
    Steps:
      - (Open file) backend/requirements.txt
      - Confirm a line exists: email-validator>=2.0.0
    Expected:
      - File contains the dependency line once
    Evidence: .sisyphus/evidence/task-1-add-email-validator.txt
  ```

  **Commit**: NO

- [x] 2. Install dependency into current backend venv

  **What to do**:
  - From `backend/` with venv activated:
    - `pip install email-validator`
  - Then re-run requirements install to ensure consistent state:
    - `pip install -r requirements.txt`

  **Must NOT do**:
  - Do not run `pip install -U ...`.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: environment/package install
  - Skills: []

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: [3] | Blocked By: [1]

  **References**:
  - Pydantic ImportError message: `pip install 'pydantic[email]'` (we choose explicit `email-validator` to avoid extra upgrades)

  **Acceptance Criteria**:
  - [x] `python -c "import email_validator"` succeeds in the venv

  **QA Scenarios**:
  ```
  Scenario: Install email-validator
    Tool: Bash
    Steps:
      - cd backend
      - venv\Scripts\activate
      - pip install email-validator
      - python -c "import email_validator"
    Expected:
      - pip install succeeds
      - import succeeds
    Evidence: .sisyphus/evidence/task-2-install-email-validator.txt
  ```

  **Commit**: NO

- [x] 3. Verify backend imports + uvicorn boot + health check

  **What to do**:
  - From `backend/` (venv activated):
    - `python -c "from schemas.auth import RegisterRequest; RegisterRequest(email='a@connect.ust.hk', password='12345678')"`
    - `python -c "from schemas.auth import RegisterRequest; RegisterRequest(email='a@gmail.com', password='12345678')"` (should fail validation)
  - Start backend:
    - `uvicorn main:app --reload --host 0.0.0.0 --port 8000`
  - In a second shell:
    - `curl http://localhost:8000/health`

  **Must NOT do**:
  - Do not change validation logic.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: multi-process run + verification
  - Skills: []

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: [] | Blocked By: [2]

  **References**:
  - Code: `backend/schemas/auth.py` — HKUST email validator message
  - API: `backend/main.py` provides `/health`

  **Acceptance Criteria**:
  - [x] Import + validation checks behave as expected
  - [x] `/health` returns ok

  **QA Scenarios**:
  ```
  Scenario: Happy path boot
    Tool: Bash
    Steps:
      - cd backend
      - venv\Scripts\activate
      - uvicorn main:app --reload --host 0.0.0.0 --port 8000
      - curl http://localhost:8000/health
    Expected:
      - No ImportError stacktrace
      - Health returns {"status":"ok"}
    Evidence: .sisyphus/evidence/task-3-uvicorn-health.txt

  Scenario: Email domain validation still enforced
    Tool: Bash
    Steps:
      - cd backend
      - venv\Scripts\activate
      - python -c "from schemas.auth import RegisterRequest; RegisterRequest(email='a@gmail.com', password='12345678')"
    Expected:
      - Non-zero exit
      - Output includes 'Only @connect.ust.hk emails are allowed'
    Evidence: .sisyphus/evidence/task-3-email-domain-validation.txt
  ```

  **Commit**: NO

- [x] 4. (Optional) Align Python baseline to project expectation (3.10–3.12) — SKIPPED: Not needed, backend works with Python 3.13.7

  **What to do**:
  - If the team wants strict alignment with `AGENTS.md` guidance, install Python 3.12 and recreate venv:
    - `py -3.12 -m venv venv`
    - Activate + `pip install -r requirements.txt`
  - Confirm uvicorn boots as in Task 3.

  **Must NOT do**:
  - Do not do this unless baseline alignment is required; it’s not needed to fix the immediate error.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: environment recreation
  - Skills: []

  **Parallelization**: Can Parallel: NO | Optional Wave | Blocks: [] | Blocked By: [3]

  **References**:
  - Doc: `AGENTS.md` — stack expects Python 3.10+

  **Acceptance Criteria**:
  - [x] New venv uses target Python — N/A (task skipped)
  - [x] Tasks 2–3 pass unchanged — N/A (task skipped)

  **QA Scenarios**:
  ```
  Scenario: Recreate venv on Python 3.12
    Tool: Bash
    Steps:
      - cd backend
      - rmdir /s /q venv  (ONLY if acceptable; otherwise create venv312)
      - py -3.12 -m venv venv
      - venv\Scripts\activate
      - pip install -r requirements.txt
      - uvicorn main:app --host 0.0.0.0 --port 8000
    Expected:
      - Backend boots
    Evidence: .sisyphus/evidence/task-4-python-baseline.txt
  ```

  **Commit**: NO

## Final Verification Wave
- [x] F1. Dependency Reproducibility Audit — oracle
  - Confirm `pip install -r backend/requirements.txt` includes `email-validator` and backend boots.
- [x] F2. Scope Fidelity Check — deep
  - Confirm no schema semantics changed.

## Success Criteria
- Backend starts without ImportError and `/health` returns ok.
