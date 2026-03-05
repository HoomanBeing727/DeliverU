# Fix Docker Desktop Linux engine named pipe missing (Windows)

## TL;DR
> **Summary**: Restore Docker Desktop’s Linux engine (WSL2) so the Docker daemon becomes reachable, then start Postgres via `backend/docker-compose.yml`.
> **Deliverables**:
> - Decision-tree runbook for `open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified`
> - Verified Postgres container `deliveru_db` running and accepting connections
> - Optional: silence Compose `version`-obsolete warning (executor-only)
> **Effort**: Short
> **Parallel**: YES — 2 waves + verification
> **Critical Path**: Engine reachable (`docker info`) → `docker compose up -d` → DB readiness checks

## Context
### Original Request
- Running `docker compose up -d` in `backend/` fails on Windows with:
  - `open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified.`
  - Warning: `docker-compose.yml: the attribute version is obsolete` (non-blocking).

### Interview Summary
- No additional preferences required to start diagnosis.
- User approved last-resort destructive recovery if needed (factory reset / purge / WSL distro removal).

### Repo + System Findings (grounded)
- Repo DB compose: `backend/docker-compose.yml`
  - Postgres: `postgres:16-alpine`, container `deliveru_db`, port `5432:5432`, named volume `pg_data`.
- Backend DB URL: `backend/.env` uses `postgresql+asyncpg://deliveru:deliveru_dev@localhost:5432/deliveru`.
- Local system outputs (captured earlier):
  - `docker context ls` shows active `desktop-linux` endpoint `npipe:////./pipe/dockerDesktopLinuxEngine`.
  - `docker version` fails to connect to `dockerDesktopLinuxEngine` named pipe.
  - `sc query com.docker.service` shows Docker Desktop service STOPPED.
  - `wsl -l -v` shows `Ubuntu` and `docker-desktop` STOPPED.
  - Docker Desktop executable exists: `C:\Program Files\Docker\Docker\Docker Desktop.exe`.

### Metis Review (gaps addressed)
- Runbook must be a **decision tree** keyed off command output.
- Non-destructive checks first; destructive resets last with explicit consent.
- Must cover: service not running, wrong context/DOCKER_HOST override, WSL2 health, Windows vs Linux engine, port 5432 conflict.

### External References (authoritative)
- Docker Desktop Troubleshoot + diagnostics + logs:
  - https://docs.docker.com/desktop/troubleshoot/overview/

## Work Objectives
### Core Objective
- Make Docker daemon reachable (no named pipe error) and bring up Postgres via Compose.

### Deliverables
- A step-by-step executor runbook (tasks below) that ends with verifiable success commands.

### Definition of Done (verifiable)
- [ ] `docker info` succeeds (prints **Server** section; exit code 0)
- [ ] From `backend/`: `docker compose up -d` succeeds
- [ ] `docker ps --filter name=deliveru_db` shows container **Up** with `5432->5432`
- [ ] `docker logs deliveru_db` contains `database system is ready to accept connections`
- [ ] `docker exec deliveru_db pg_isready -U deliveru` reports `accepting connections`
- [ ] Host can reach DB port: PowerShell `Test-NetConnection localhost -Port 5432` returns `TcpTestSucceeded : True`

### Must Have
- Decision-tree troubleshooting that avoids data loss by default.

### Must NOT Have (guardrails)
- MUST NOT run any destructive commands without explicit consent (CONSENT GIVEN in interview summary, still re-confirm before executing):
  - `docker compose down -v`
  - Docker Desktop “Reset to factory defaults”
  - `wsl --unregister docker-desktop` / `wsl --unregister docker-desktop-data`
  - Deleting `C:\Users\<user>\AppData\Local\Docker\*`
- MUST NOT change application code to work around Docker.

## Verification Strategy
> ZERO HUMAN INTERVENTION preferred; however, Docker Desktop may require elevated permissions and/or UI start. The executor should prefer command-driven starts and only use UI as a last resort.
- Test decision: **none** (infra not configured). Verification via CLI commands only.
- Evidence: Save command outputs to `.sisyphus/evidence/task-{N}-{slug}.txt` (copy/paste output).

## Execution Strategy
### Parallel Execution Waves
Wave 1 (Diagnostics — can run in parallel):
- Confirm context + DOCKER_HOST override status
- Confirm Docker Desktop service state
- Confirm WSL state
- Check port 5432 conflict

Wave 2 (Remediation — sequential within wave, but can branch):
- Start Docker Desktop service + app
- Ensure Linux engine (WSL2) is selected
- Confirm daemon reachable

Wave 3 (Compose + DB readiness):
- Bring up Postgres container
- Verify readiness + host connectivity

Wave 4 (Optional cleanup + fallback if Docker cannot run):
- Optional: remove obsolete `version:` in compose
- Fallback: run Postgres without Docker (only if user chooses)

### Dependency Matrix (full)
- 1–4 are independent diagnostics
- 5–7 depend on 2/3 outputs (service/WSL) and may require admin
- 8–10 depend on daemon reachability
- 11–12 depend on 8–10 and user decisions

### Agent Dispatch Summary
- Wave 1: 4 tasks (unspecified-low)
- Wave 2: 3 tasks (unspecified-high; Windows admin + Docker Desktop)
- Wave 3: 3 tasks (unspecified-low)
- Wave 4: 2 tasks (optional; unspecified-low)

## TODOs
> Implementation + Verification = ONE task.
> Every task includes QA scenarios with exact commands.

- [ ] 1. Capture baseline Docker context + override signals

  **What to do**:
  - Run these commands and record output:
    - `docker context ls`
    - `docker context show`
    - `set DOCKER_HOST` (cmd) / `echo $env:DOCKER_HOST` (PowerShell)
    - `docker version` (capture full error)

  **Must NOT do**:
  - Do not change contexts yet.

  **Recommended Agent Profile**:
  - Category: `unspecified-low` — Reason: simple command capture
  - Skills: []

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: [] | Blocked By: []

  **References**:
  - Repo: `backend/docker-compose.yml` — DB service expects Docker daemon access

  **Acceptance Criteria**:
  - [ ] Evidence file contains all four command outputs and error text.

  **QA Scenarios**:
  ```
  Scenario: Capture current docker context and error
    Tool: Bash
    Steps:
      - docker context ls
      - docker context show
      - set DOCKER_HOST
      - docker version
    Expected:
      - Outputs saved verbatim
    Evidence: .sisyphus/evidence/task-1-baseline-docker.txt

  Scenario: Detect DOCKER_HOST override
    Tool: Bash
    Steps:
      - set DOCKER_HOST
    Expected:
      - Either shows variable is undefined OR shows a value that must be cleared in a later task
    Evidence: .sisyphus/evidence/task-1-docker-host.txt
  ```

  **Commit**: NO

- [ ] 2. Confirm Docker Desktop Windows service status + attempt non-destructive start

  **What to do**:
  - Run:
    - `sc query com.docker.service`
  - If STOPPED, attempt start (may require admin):
    - `sc start com.docker.service`
  - Re-check:
    - `sc query com.docker.service`

  **Must NOT do**:
  - Do not change service startup type in registry.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: Windows service control, potential admin prompts
  - Skills: []

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: [5] | Blocked By: []

  **References**:
  - System: `com.docker.service` must be RUNNING for Desktop-managed engine

  **Acceptance Criteria**:
  - [ ] Evidence shows final `STATE` is RUNNING OR command fails with explicit “access denied”/policy message.

  **QA Scenarios**:
  ```
  Scenario: Start Docker Desktop service
    Tool: Bash
    Steps:
      - sc query com.docker.service
      - sc start com.docker.service
      - sc query com.docker.service
    Expected:
      - If admin allowed: service transitions to RUNNING
      - If not allowed: clear error captured
    Evidence: .sisyphus/evidence/task-2-docker-service.txt

  Scenario: Access denied edge case
    Tool: Bash
    Steps:
      - sc start com.docker.service
    Expected:
      - Error indicates permissions; later tasks must switch to user-action path
    Evidence: .sisyphus/evidence/task-2-docker-service-denied.txt
  ```

  **Commit**: NO

- [ ] 3. Validate WSL is available and Docker Desktop WSL distros exist

  **What to do**:
  - Run:
    - `wsl --status`
    - `wsl -l -v`
  - Confirm `docker-desktop` appears and is Version 2.

  **Must NOT do**:
  - Do not unregister any WSL distro.

  **Recommended Agent Profile**:
  - Category: `unspecified-low` — Reason: inspection only
  - Skills: []

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: [6] | Blocked By: []

  **References**:
  - System: Docker Desktop Linux engine depends on WSL2 backend

  **Acceptance Criteria**:
  - [ ] Evidence shows WSL status and distro list.

  **QA Scenarios**:
  ```
  Scenario: Confirm WSL distros exist
    Tool: Bash
    Steps:
      - wsl --status
      - wsl -l -v
    Expected:
      - docker-desktop listed
    Evidence: .sisyphus/evidence/task-3-wsl-status.txt

  Scenario: Missing docker-desktop distro
    Tool: Bash
    Steps:
      - wsl -l -v
    Expected:
      - If missing: record and branch to reinstall/repair Docker Desktop (non-destructive)
    Evidence: .sisyphus/evidence/task-3-wsl-missing.txt
  ```

  **Commit**: NO

- [ ] 4. Check for local port 5432 conflict (prevents Postgres start later)

  **What to do**:
  - In PowerShell (preferred): `Test-NetConnection localhost -Port 5432`
  - In cmd fallback: `netstat -ano | findstr ":5432"`
  - If something is already listening on 5432, record PID and be ready to stop/disable that service *only after* Docker daemon is fixed.

  **Must NOT do**:
  - Do not kill processes yet.

  **Recommended Agent Profile**:
  - Category: `unspecified-low` — Reason: inspection only
  - Skills: []

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: [9] | Blocked By: []

  **References**:
  - Repo: `backend/docker-compose.yml:8-9` maps host port 5432

  **Acceptance Criteria**:
  - [ ] Evidence indicates whether port is free (nothing listening) or in use (PID captured).

  **QA Scenarios**:
  ```
  Scenario: Detect 5432 port conflict
    Tool: Bash
    Steps:
      - powershell -NoProfile -Command "Test-NetConnection localhost -Port 5432 | Format-List"
      - netstat -ano | findstr ":5432"
    Expected:
      - Clear signal whether 5432 is already in use
    Evidence: .sisyphus/evidence/task-4-port-5432.txt

  Scenario: Conflict present
    Tool: Bash
    Steps:
      - netstat -ano | findstr ":5432"
    Expected:
      - PID is recorded for later remediation
    Evidence: .sisyphus/evidence/task-4-port-5432-conflict.txt
  ```

  **Commit**: NO

- [ ] 5. Start Docker Desktop app and wait for engine initialization

  **What to do**:
  - Launch Docker Desktop via command:
    - `start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"`
  - Wait up to ~2 minutes, then check:
    - `docker info`
  - If still failing with the same pipe error, proceed to Task 6/7.

  **Must NOT do**:
  - Do not reset Docker Desktop settings.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: interacts with Desktop-managed daemon and timing
  - Skills: []

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: [8] | Blocked By: [2]

  **References**:
  - System: Docker Desktop exe exists at `C:\Program Files\Docker\Docker\Docker Desktop.exe` (verified)

  **Acceptance Criteria**:
  - [ ] Either `docker info` succeeds OR evidence clearly shows persistent pipe error after Desktop start.

  **QA Scenarios**:
  ```
  Scenario: Start Desktop and confirm docker info
    Tool: Bash
    Steps:
      - start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
      - timeout /t 30
      - docker info
    Expected:
      - docker info prints Server section (success) OR captures unchanged pipe error
    Evidence: .sisyphus/evidence/task-5-start-desktop.txt

  Scenario: Desktop starts but engine remains down
    Tool: Bash
    Steps:
      - docker info
    Expected:
      - Same pipe error persists, triggering next remediation tasks
    Evidence: .sisyphus/evidence/task-5-engine-still-down.txt
  ```

  **Commit**: NO

- [ ] 6. Force Docker Desktop to use Linux engine (WSL2) and re-check daemon

  **What to do**:
  - Use DockerCli helper to switch to Linux engine:
    - `"C:\Program Files\Docker\Docker\DockerCli.exe" -SwitchLinuxEngine`
  - Wait ~30 seconds then run:
    - `docker info`
  - If the helper fails, capture its output.

  **Must NOT do**:
  - Do not switch to Windows engine unless you intend to run Windows containers (not applicable here).

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: engine mode switch
  - Skills: []

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: [8] | Blocked By: [5]

  **References**:
  - Helper: `C:\Program Files\Docker\Docker\DockerCli.exe` supports `-SwitchLinuxEngine` (verified)

  **Acceptance Criteria**:
  - [ ] After switch, `docker info` succeeds OR a new, more specific error is captured.

  **QA Scenarios**:
  ```
  Scenario: Switch to Linux engine
    Tool: Bash
    Steps:
      - "C:\Program Files\Docker\Docker\DockerCli.exe" -SwitchLinuxEngine
      - timeout /t 30
      - docker info
    Expected:
      - docker info works OR error is captured with full text
    Evidence: .sisyphus/evidence/task-6-switch-linux-engine.txt

  Scenario: Helper fails
    Tool: Bash
    Steps:
      - "C:\Program Files\Docker\Docker\DockerCli.exe" -SwitchLinuxEngine
    Expected:
      - Non-zero exit and error text captured
    Evidence: .sisyphus/evidence/task-6-switch-linux-engine-fail.txt
  ```

  **Commit**: NO

- [ ] 7. Eliminate context/override misconfiguration (only if baseline indicates)

  **What to do**:
  - If Task 1 shows `DOCKER_HOST` is set, clear it for the session:
    - cmd: `set DOCKER_HOST=`
    - PowerShell: `Remove-Item Env:DOCKER_HOST -ErrorAction SilentlyContinue`
  - Ensure context is `desktop-linux` (or whichever context matches the daemon you’re using):
    - `docker context use desktop-linux`
  - Re-test:
    - `docker info`

  **Must NOT do**:
  - Do not permanently modify user environment (no registry edits); session-only unless explicitly requested.

  **Recommended Agent Profile**:
  - Category: `unspecified-low` — Reason: simple configuration correction
  - Skills: []

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: [8] | Blocked By: [1,5]

  **References**:
  - System: `docker context ls` currently shows `desktop-linux` pointing to the missing pipe endpoint.

  **Acceptance Criteria**:
  - [ ] `docker info` succeeds after clearing overrides OR evidence shows it still fails (indicating daemon truly down).

  **QA Scenarios**:
  ```
  Scenario: Clear DOCKER_HOST and retest
    Tool: Bash
    Steps:
      - set DOCKER_HOST=
      - docker context use desktop-linux
      - docker info
    Expected:
      - docker info succeeds OR provides a different, actionable error
    Evidence: .sisyphus/evidence/task-7-clear-overrides.txt

  Scenario: No overrides present
    Tool: Bash
    Steps:
      - set DOCKER_HOST
    Expected:
      - Confirms variable not set; skip clearing
    Evidence: .sisyphus/evidence/task-7-no-overrides.txt
  ```

  **Commit**: NO

- [ ] 8. Confirm daemon reachability (gate for compose)

  **What to do**:
  - Run:
    - `docker info`
    - `docker version`
  - If either still shows named pipe error, STOP and capture diagnostics for escalation:
    - Docker Desktop UI status (screenshot if possible)
    - Collect Docker Desktop diagnostics from terminal (officially supported):
      - `"C:\Program Files\Docker\Docker\resources\com.docker.diagnose.exe" gather -upload`
      - Record the Diagnostic ID printed
    - Capture Docker Desktop logs directory listing:
      - cmd: `dir "%LOCALAPPDATA%\Docker\log"`
      - PowerShell: `Get-ChildItem "$Env:LOCALAPPDATA\Docker\log" | Select-Object FullName,Length,LastWriteTime`

  **Must NOT do**:
  - Do not proceed to compose if daemon unreachable.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: gating + possible log capture
  - Skills: []

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: [9] | Blocked By: [5,6,7]

  **References**:
  - External (official):
    - https://docs.docker.com/desktop/troubleshoot/overview/
  - External (triage examples; non-authoritative):
    - https://github.com/docker/for-win/issues/14267
    - https://stackoverflow.com/questions/63330590/error-response-from-daemon-open-pipe-docker-engine-linux-the-system-cannot

  **Acceptance Criteria**:
  - [ ] Evidence shows `docker info` prints Server section.

  **QA Scenarios**:
  ```
  Scenario: Gate on docker info
    Tool: Bash
    Steps:
      - docker info
      - docker version
    Expected:
      - No pipe error; server reachable
    Evidence: .sisyphus/evidence/task-8-daemon-reachable.txt

  Scenario: Daemon still unreachable
    Tool: Bash
    Steps:
      - docker info
      - "C:\Program Files\Docker\Docker\resources\com.docker.diagnose.exe" gather -upload
      - dir "%LOCALAPPDATA%\Docker\log"
    Expected:
      - Pipe error captured; diagnostics ID captured; logs path listing captured
    Evidence: .sisyphus/evidence/task-8-daemon-unreachable.txt
  ```

  **Commit**: NO

- [ ] 9. Start Postgres via Compose (repo-defined)

  **What to do**:
  - From repo root, run in `backend/`:
    - `docker compose up -d`
  - If compose fails with port binding error, use evidence from Task 4 to resolve (stop local Postgres service / free 5432) and retry.

  **Must NOT do**:
  - Do not change compose credentials.

  **Recommended Agent Profile**:
  - Category: `unspecified-low` — Reason: standard compose usage
  - Skills: []

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: [10] | Blocked By: [8]

  **References**:
  - Repo: `backend/docker-compose.yml`
  - Repo: `AGENTS.md` DB run command

  **Acceptance Criteria**:
  - [ ] `docker compose up -d` exits 0 and `docker ps` shows `deliveru_db`.

  **QA Scenarios**:
  ```
  Scenario: Bring up Postgres container
    Tool: Bash
    Steps:
      - cd backend
      - docker compose up -d
      - docker ps --filter "name=deliveru_db" --format "{{.Names}}\t{{.Status}}\t{{.Ports}}"
    Expected:
      - deliveru_db is Up and exposes 5432
    Evidence: .sisyphus/evidence/task-9-compose-up.txt

  Scenario: Port conflict prevents start
    Tool: Bash
    Steps:
      - cd backend
      - docker compose up -d
    Expected:
      - Error includes bind/port 5432 conflict; executor uses Task-4 PID evidence to resolve
    Evidence: .sisyphus/evidence/task-9-compose-port-conflict.txt
  ```

  **Commit**: NO

- [ ] 10. Verify Postgres readiness + host connectivity

  **What to do**:
  - Run:
    - `docker logs deliveru_db`
    - `docker exec deliveru_db pg_isready -U deliveru`
    - `powershell -NoProfile -Command "Test-NetConnection localhost -Port 5432 | Format-List"`

  **Must NOT do**:
  - Do not assume readiness based only on container Up status.

  **Recommended Agent Profile**:
  - Category: `unspecified-low` — Reason: readiness checks
  - Skills: []

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: [11] | Blocked By: [9]

  **References**:
  - Repo: `backend/docker-compose.yml` env credentials for `pg_isready`

  **Acceptance Criteria**:
  - [ ] Logs show “ready to accept connections” and `pg_isready` returns accepting.

  **QA Scenarios**:
  ```
  Scenario: Happy path readiness
    Tool: Bash
    Steps:
      - docker logs deliveru_db
      - docker exec deliveru_db pg_isready -U deliveru
      - powershell -NoProfile -Command "Test-NetConnection localhost -Port 5432 | Format-List"
    Expected:
      - Logs include readiness message
      - pg_isready reports accepting connections
      - TcpTestSucceeded is True
    Evidence: .sisyphus/evidence/task-10-db-ready.txt

  Scenario: DB not ready yet
    Tool: Bash
    Steps:
      - docker exec deliveru_db pg_isready -U deliveru
    Expected:
      - If not accepting, executor waits and re-checks; captures final result
    Evidence: .sisyphus/evidence/task-10-db-not-ready.txt
  ```

  **Commit**: NO

- [ ] 11. Optional: silence Compose warning by removing obsolete `version:` key

  **What to do**:
  - Only if desired (non-functional change): remove line `version: "3.9"` from `backend/docker-compose.yml`.

  **Must NOT do**:
  - Do not change service config.

  **Recommended Agent Profile**:
  - Category: `unspecified-low` — Reason: one-line cleanup
  - Skills: []

  **Parallelization**: Can Parallel: YES | Wave 4 | Blocks: [] | Blocked By: [9]

  **References**:
  - Repo: `backend/docker-compose.yml:1` currently has obsolete `version` key

  **Acceptance Criteria**:
  - [ ] `docker compose up -d` emits no “attribute version is obsolete” warning (or warning reduced).

  **QA Scenarios**:
  ```
  Scenario: Warning removed
    Tool: Bash
    Steps:
      - cd backend
      - docker compose up -d
    Expected:
      - No obsolete-version warning
    Evidence: .sisyphus/evidence/task-11-compose-warning.txt

  Scenario: No-op if executor declines
    Tool: Bash
    Steps:
      - (skip edit)
    Expected:
      - Warning may remain; no functional impact
    Evidence: .sisyphus/evidence/task-11-skip.txt
  ```

  **Commit**: YES | Message: `chore(backend): remove obsolete compose version key` | Files: [`backend/docker-compose.yml`]

- [ ] 12. Fallback (only if Docker Desktop cannot be started): choose non-Docker Postgres path

  **What to do**:
  - **[DECISION NEEDED]** Choose ONE fallback:
    1) Install native Windows Postgres and create DB/user to match `.env` and `docker-compose.yml`
    2) Run Postgres inside Ubuntu WSL (not Docker) and expose port 5432 to Windows
    3) Use a hosted Postgres (then update `backend/.env` locally; keep secrets out of git)
  - Ensure the resulting connection string still matches:
    - `postgresql+asyncpg://deliveru:deliveru_dev@localhost:5432/deliveru` (or update `.env` locally)

  **Must NOT do**:
  - Do not commit `.env` changes or any secrets.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: OS-level install/networking
  - Skills: []

  **Parallelization**: Can Parallel: NO | Wave 4 | Blocks: [] | Blocked By: [8]

  **References**:
  - Repo: `backend/.env` (must not be committed if modified)
  - Repo: `AGENTS.md` notes `.env` contains dev secrets and should stay ignored

  **Acceptance Criteria**:
  - [ ] Backend can connect to Postgres using the effective `DATABASE_URL` (validated by running backend health after DB up).

  **QA Scenarios**:
  ```
  Scenario: Fallback path selected and DB reachable
    Tool: Bash
    Steps:
      - Confirm service is listening on 5432 (Test-NetConnection)
      - (If backend run is allowed) start uvicorn and hit /health
    Expected:
      - Port reachable; /health returns ok once backend runs
    Evidence: .sisyphus/evidence/task-12-fallback-db.txt

  Scenario: Secret-safety
    Tool: Bash
    Steps:
      - git status
    Expected:
      - backend/.env not staged/committed
    Evidence: .sisyphus/evidence/task-12-secret-safety.txt
  ```

  **Commit**: NO

- [ ] 13. (Last resort, DESTRUCTIVE) Purge Docker Desktop data / reset to restore engine startup

  **What to do**:
  - Preconditions:
    - Tasks 5–8 have failed to make `docker info` work.
    - Evidence captured: `.sisyphus/evidence/task-8-daemon-unreachable.txt` including Diagnostic ID.
  - Use Docker Desktop UI (Troubleshoot) to apply the least destructive option first:
    1) **Restart Docker Desktop**
    2) **Clean / Purge data** (will remove Docker data; may preserve some settings)
    3) **Reset to factory defaults** (full reset)
  - After each action, re-test:
    - `docker info`
  - If still failing and WSL is implicated, proceed to WSL distro removal/recreation (very destructive):
    - `wsl -l -v`
    - `wsl --unregister docker-desktop`
    - `wsl --unregister docker-desktop-data`
    - Re-launch Docker Desktop to recreate distros
    - Re-test `docker info`

  **Must NOT do**:
  - Do not unregister unrelated distros (e.g., Ubuntu dev distro) unless explicitly requested.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: destructive recovery, UI + WSL admin operations
  - Skills: []

  **Parallelization**: Can Parallel: NO | Wave 4 | Blocks: [9] | Blocked By: [8]

  **References**:
  - External (official): https://docs.docker.com/desktop/troubleshoot/overview/

  **Acceptance Criteria**:
  - [ ] `docker info` succeeds after reset steps (prints Server section).

  **QA Scenarios**:
  ```
  Scenario: Purge/reset restores daemon
    Tool: Bash
    Steps:
      - docker info
    Expected:
      - Server section is present; no pipe error
    Evidence: .sisyphus/evidence/task-13-reset-restored-daemon.txt

  Scenario: Reset fails; fallback triggered
    Tool: Bash
    Steps:
      - docker info
    Expected:
      - Still failing; executor proceeds to Task 12 fallback selection
    Evidence: .sisyphus/evidence/task-13-reset-failed.txt
  ```

  **Commit**: NO

## Final Verification Wave (4 parallel agents, ALL must APPROVE)
- [ ] F1. Plan Compliance Audit — oracle
- [ ] F2. Code Quality Review (no code changes expected) — unspecified-high
- [ ] F3. End-to-end DB bring-up verification (commands in DoD) — unspecified-high
- [ ] F4. Scope Fidelity Check (no app code workarounds) — deep

## Commit Strategy
- Only Task 11 is a repo change (optional). All other tasks are system-state changes or command execution and should not create commits.

## Success Criteria
- Docker daemon reachable + Compose brings up Postgres + DB readiness verified per DoD.
