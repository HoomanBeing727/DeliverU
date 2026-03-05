# Expo Go over Tailscale: API base URL + Metro host fixes

## TL;DR
> **Summary**: Make the mobile app’s backend host configurable (env var) with a Tailscale fallback (`100.69.255.57`), and ensure Expo Metro serves a bundle reachable over Tailscale LAN.
> **Deliverables**:
> - Mobile API baseURL reads `EXPO_PUBLIC_API_BASE_URL` (fallback to `http://100.69.255.57:8000`)
> - `mobile/package.json` scripts for LAN-via-Tailscale (win + nix)
> - `AGENTS.md` updated with the new SSH+Tailscale runbook
> **Effort**: Quick
> **Parallel**: NO
> **Critical Path**: Update `client.ts` → update scripts/docs → verify via `tsc` + health curl

## Context
### Original Request
- Developing via **SSH + Tailscale**; Expo Go networking and app start commands need changes.
- Backend/API host should use Tailscale IP: **`100.69.255.57`**.

### Interview Summary
- Decision: Use **env var + fallback** (not hardcoded-only).
- Decision: Use **LAN via Tailscale IP** for Metro bundler (not tunnel).

### Metis Review (gaps addressed)
- Avoid adding `cross-env` dependency; provide OS-specific scripts/commands.
- Define env var contract: `EXPO_PUBLIC_API_BASE_URL` should be a full URL (`http://100.69.255.57:8000`).
- Add verification that Expo prints URLs containing the Tailscale IP and backend health is reachable.

## Work Objectives
### Core Objective
Allow Expo Go (device on Tailscale) to reach:
1) the **backend API** at `100.69.255.57:8000`
2) the **Metro bundler** over LAN mode using host `100.69.255.57`

### Deliverables
- Update `mobile/src/api/client.ts` baseURL resolution:
  - Primary: `process.env.EXPO_PUBLIC_API_BASE_URL`
  - Fallback:
    - native (android/ios): `http://100.69.255.57:8000`
    - web: `http://localhost:8000`
- Update `mobile/package.json` scripts to include:
  - `start:lan:ts:win` (cmd)
  - `start:lan:ts:nix` (bash/zsh)
- Update `AGENTS.md`:
  - Document SSH+Tailscale workflow and exact commands (backend + Expo)
  - Document env var contract + examples

### Definition of Done (verifiable)
- `mobile` typecheck passes: `npx tsc --noEmit`
- Repo no longer contains the old host `192.168.3.201` in mobile API client
- `curl http://100.69.255.57:8000/health` returns `{"status":"ok"}` when backend is running
- `expo start --lan` output contains `100.69.255.57` when started with `REACT_NATIVE_PACKAGER_HOSTNAME=100.69.255.57`

### Must Have
- No new dependencies added for env handling (NO `cross-env`).
- No secrets introduced into `EXPO_PUBLIC_*` variables.

### Must NOT Have
- Do NOT switch to tunnel mode by default.
- Do NOT add a settings screen to configure host.
- Do NOT alter backend routing/auth logic.

## Verification Strategy
> ZERO HUMAN INTERVENTION where possible; device interaction is not required for these checks.
- Tests: none (no framework). Use TypeScript typecheck + command-output assertions.
- Evidence files:
  - `.sisyphus/evidence/task-1-mobile-tsc.txt`
  - `.sisyphus/evidence/task-2-health.txt`
  - `.sisyphus/evidence/task-3-expo-lan-host.txt`

## Execution Strategy
### Parallel Execution Waves
Wave 1 (sequential, small scope): Task 1 → Task 2 → Task 3

### Dependency Matrix
- Task 1 blocks Task 3 (docs/scripts must match final env var behavior)
- Task 2 independent but should be updated after scripts/docs decided

## TODOs

- [ ] 1. Make mobile API base URL Tailscale-aware (env var + fallback)

  **What to do**:
  1) Edit `mobile/src/api/client.ts`:
     - Replace the hardcoded `DEV_MACHINE_IP` constant.
     - Implement:
       - `const envBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;`
       - If `envBaseUrl` is a non-empty string: use it directly as Axios `baseURL`.
       - Else fallback by platform:
         - `web` → `http://localhost:8000`
         - everything else → `http://100.69.255.57:8000`
  2) Keep the existing auth interceptor behavior.

  **Must NOT do**:
  - Do not introduce a new `.env` file under `mobile/`.
  - Do not add new dependencies.

  **Recommended Agent Profile**:
  - Category: `quick` — single-file logic update
  - Skills: none

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: Task 2, Task 3 | Blocked By: none

  **References**:
  - Current implementation: `mobile/src/api/client.ts`
  - Tailscale fallback IP: `100.69.255.57`

  **Acceptance Criteria**:
  - [ ] `mobile/src/api/client.ts` contains `EXPO_PUBLIC_API_BASE_URL` usage
  - [ ] `mobile/src/api/client.ts` no longer contains `192.168.3.201`

  **QA Scenarios**:
  ```
  Scenario: Env var overrides fallback
    Tool: Bash
    Steps:
      1) Set EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
      2) Start Expo bundler (no device needed)
      3) Confirm code path uses env var (static check: file contains env var read)
    Expected: baseURL is derived from EXPO_PUBLIC_API_BASE_URL when present
    Evidence: .sisyphus/evidence/task-1-mobile-tsc.txt

  Scenario: Fallback uses Tailscale IP on native
    Tool: Bash
    Steps:
      1) Ensure EXPO_PUBLIC_API_BASE_URL is unset
      2) Static check: fallback string includes http://100.69.255.57:8000
    Expected: native fallback is http://100.69.255.57:8000
    Evidence: .sisyphus/evidence/task-1-mobile-tsc.txt
  ```

  **Commit**: NO (only commit if user explicitly requests)


- [ ] 2. Add Expo start scripts for LAN-via-Tailscale (no new deps)

  **What to do**:
  1) Edit `mobile/package.json` and add scripts:
     - `start:lan:ts:win`: `set REACT_NATIVE_PACKAGER_HOSTNAME=100.69.255.57&& expo start --lan`
     - `start:lan:ts:nix`: `REACT_NATIVE_PACKAGER_HOSTNAME=100.69.255.57 expo start --lan`
  2) Keep existing scripts unchanged.

  **Must NOT do**:
  - Do not add `cross-env`.

  **Recommended Agent Profile**:
  - Category: `quick`
  - Skills: none

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: Task 3 | Blocked By: Task 1

  **References**:
  - Scripts file: `mobile/package.json`

  **Acceptance Criteria**:
  - [ ] `npm run start:lan:ts:win` exists in `mobile/package.json`
  - [ ] `npm run start:lan:ts:nix` exists in `mobile/package.json`

  **QA Scenarios**:
  ```
  Scenario: Scripts present and syntactically valid
    Tool: Bash
    Steps:
      1) Read mobile/package.json
      2) Confirm scripts keys exist exactly as specified
    Expected: Both scripts exist and match the command strings
    Evidence: .sisyphus/evidence/task-3-expo-lan-host.txt

  Scenario: Expo prints LAN host when started (host string check)
    Tool: Bash
    Steps:
      1) Run npm run start:lan:ts:win (on Windows cmd) OR start:lan:ts:nix (on nix)
      2) Observe console output
    Expected: Output contains substring "100.69.255.57" in the dev URL
    Evidence: .sisyphus/evidence/task-3-expo-lan-host.txt
  ```

  **Commit**: NO


- [ ] 3. Update AGENTS.md with SSH + Tailscale runbook

  **What to do**:
  1) Update `AGENTS.md`:
     - In **Frontend** section, add:
       - Env var contract:
         - `EXPO_PUBLIC_API_BASE_URL` must be a full URL, e.g. `http://100.69.255.57:8000`
       - Recommended Expo start commands:
         - Windows cmd: `npm run start:lan:ts:win`
         - macOS/Linux: `npm run start:lan:ts:nix`
     - In **Backend** section, explicitly include:
       - `uvicorn main:app --reload --host 0.0.0.0 --port 8000`
       - Health check: `curl http://100.69.255.57:8000/health`
     - In **Known Issues**, keep note about hardcoded IP, but update it to: “Use EXPO_PUBLIC_API_BASE_URL; don’t hardcode.”
     - Add a short note about firewall:
       - Ensure inbound access on ports: `8000` (API) and the Expo/Metro port printed by Expo.

  **Must NOT do**:
  - Do not document secrets in public env vars.

  **Recommended Agent Profile**:
  - Category: `writing`
  - Skills: none

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: none | Blocked By: Task 1, Task 2

  **References**:
  - Existing doc: `AGENTS.md`
  - API client: `mobile/src/api/client.ts`
  - Scripts: `mobile/package.json`

  **Acceptance Criteria**:
  - [ ] `AGENTS.md` includes `EXPO_PUBLIC_API_BASE_URL` usage and Tailscale example `http://100.69.255.57:8000`
  - [ ] `AGENTS.md` includes the LAN-via-Tailscale Expo start scripts

  **QA Scenarios**:
  ```
  Scenario: Doc runbook is copy/paste runnable
    Tool: Bash
    Steps:
      1) Copy the exact commands from AGENTS.md
      2) Run backend health curl (backend running)
    Expected: Health endpoint returns {"status":"ok"}
    Evidence: .sisyphus/evidence/task-2-health.txt

  Scenario: No incorrect legacy instructions remain
    Tool: Bash
    Steps:
      1) Search AGENTS.md for 192.168.3.201
      2) Search AGENTS.md for old frontend path names (if any)
    Expected: No stale IP / obsolete instructions remain
    Evidence: .sisyphus/evidence/task-1-mobile-tsc.txt
  ```

  **Commit**: NO


## Final Verification Wave (4 parallel agents, ALL must APPROVE)
- [ ] F1. Plan Compliance Audit — oracle
- [ ] F2. Code Quality Review — unspecified-high
- [ ] F3. Real Manual QA (command-based) — unspecified-high
- [ ] F4. Scope Fidelity Check — deep

## Commit Strategy
- Do not commit unless the user explicitly asks.

## Success Criteria
- Mobile app can call backend over Tailscale by setting `EXPO_PUBLIC_API_BASE_URL=http://100.69.255.57:8000`.
- Expo Metro dev URL uses `100.69.255.57` when started in LAN mode with `REACT_NATIVE_PACKAGER_HOSTNAME` set.
