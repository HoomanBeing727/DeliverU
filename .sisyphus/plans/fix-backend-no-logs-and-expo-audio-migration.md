# Plan: Fix "backend no response/no logs" on auth + migrate jump SFX off deprecated expo-av (SDK 54)

## TL;DR
> **Summary**: Your phone app isn’t reaching the backend, so the backend prints nothing. Fix the mobile API `baseURL` to always match the current Expo dev host IP (auto-detect from Expo `hostUri`), with `EXPO_PUBLIC_API_BASE_URL` as an override. Then (optional but recommended) migrate the jump sound from `expo-av` to `expo-audio` to remove the SDK 54 deprecation warning.
> **Deliverables**:
> - Mobile points to correct backend host (requests show up in backend terminal)
> - `/health` reachable from the phone
> - UST Dash jump sound uses `expo-audio` (no `[expo-av] deprecated` warning)
> **Effort**: Short
> **Parallel**: YES — 2 waves
> **Critical Path**: Fix baseURL → verify from phone → migrate audio → `npx tsc --noEmit`

## Context
### Observed repo facts
- Mobile API base URL is set in `mobile/src/api/client.ts`:
  - `envBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL`
  - fallback is hardcoded to `http://10.89.171.127:8000` for android/ios.
- Your PC’s Wi‑Fi IPv4 (from `ipconfig`) is `192.168.3.101`.
- Backend runs on `uvicorn main:app --host 0.0.0.0 --port 8000` (via `backend/start_server.bat`) so it *can* accept LAN traffic.
- Backend reads env via `backend/config.py` `Settings(model_config={"env_file": ".env"})` and `backend/.env` exists.
- The Expo warning is real: `expo-av` is deprecated in SDK 54; replacement for simple SFX is `expo-audio`.

### Root-cause hypothesis (decision-complete)
**Most likely**: mobile app is calling `http://10.89.171.127:8000/*`, which is not your current backend host on the phone’s network. Therefore **no request reaches the backend**, so **no backend terminal logs appear** when you register/login.

## Work Objectives
### Core Objective
Restore end-to-end connectivity for auth (register/login) from Expo Go on a physical phone to the local FastAPI server.

### Definition of Done
- [ ] From the phone browser: `http://192.168.3.101:8000/health` returns `{"status":"ok"}`.
- [ ] From the app: Register/Login succeeds and **backend terminal shows request logs**.
- [ ] `mobile/` passes: `npx tsc --noEmit`.
- [ ] UST Dash jump SFX plays with **no Expo AV deprecation warning** in the Metro console.

### Must NOT Have
- No changes to backend auth logic required for this issue.
- Do not hardcode temporary IPs in multiple places; keep a single, explicit config path.

## Verification Strategy
- Connectivity verification is **manual but agent-executed**:
  - Backend: observe terminal logs + `curl` health check.
  - Mobile: attempt register/login with known test account.
- Type safety: `npx tsc --noEmit`.

## Execution Strategy
### Parallel Execution Waves
- **Wave 1 (Connectivity)**: Auto-detect `baseURL` from Expo dev host + verify from phone.
- **Wave 2 (Audio migration)**: Replace `expo-av` usage with `expo-audio`, remove dependency, verify sound.

## TODOs

- [x] 1. Make mobile API base URL work at home + dorm automatically (Expo Go on phone)

  **What to do**:
  0) Ensure Expo dev server is running in **LAN mode** (required for auto-detect to work):
     - Prefer: `npx expo start --lan`
     - If you keep `npm start` (which runs `expo start`), verify the Expo DevTools “Connection” is **LAN**, not Tunnel.
     - Rationale: in Tunnel mode, `hostUri` can be `*.expo.dev` and there is no reliable LAN IP to derive.

  1) Install `expo-constants` (needed to read Expo dev host info reliably):
     - `npx expo install expo-constants`
  2) Update `mobile/src/api/client.ts` to compute the base URL in this exact priority order:
     1. `process.env.EXPO_PUBLIC_API_BASE_URL` (explicit override; supports tunnels/Tailscale)
     2. **Auto-detected LAN host** from Expo dev hostUri (home/dorm auto-switch)
     3. Final fallback: `http://localhost:8000` (web only)

     Implement auto-detect like this (decision-complete requirements):
     - Read `hostUri` from `expo-constants`:
       - Try `Constants.expoConfig?.hostUri` first
       - Then `Constants.manifest2?.extra?.expoClient?.hostUri` (if present)
       - Then `Constants.manifest?.hostUri` (legacy)
     - `hostUri` usually looks like `"192.168.3.101:8081"` or `"192.168.3.101:19000"`.
       - Extract **host** by splitting on `:` and taking the first part.
     - If extracted host is missing OR contains `"expo.dev"` (tunnel / dev proxy), DO NOT guess — return `null` so env override is required.
     - Build backend URL as: `http://${host}:8000`.
  3) (Optional but recommended) add a one-time console log in dev showing the resolved baseURL.
  4) Restart Expo dev server after adding env/installing constants.

  **Must NOT do**:
  - Don’t point to `localhost` for Expo Go on phone.
  - Don’t hardcode a single LAN IP again.

  **Recommended Agent Profile**:
  - Category: `quick` — config-only change
  - Skills: []

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 2 | Blocked By: —

  **References**:
  - Base URL config: `mobile/src/api/client.ts:5-11`
  - Phone override env var: `process.env.EXPO_PUBLIC_API_BASE_URL`
  - Expo hostUri source: `expo-constants` (SDK 54)

  **Acceptance Criteria**:
  - [ ] When you switch Wi‑Fi networks (home ↔ dorm), the app reaches the backend without editing code.
  - [ ] Backend terminal logs appear for auth requests.

  **QA Scenarios**:
  ```
  Scenario: Backend reachable from phone (home OR dorm)
    Tool: Phone browser + backend terminal
    Steps:
      1) Start backend: `uvicorn main:app --reload --host 0.0.0.0 --port 8000`
      2) On phone browser open: http://<PC_LAN_IP>:8000/health
    Expected:
      - Browser shows {"status":"ok"}
      - Backend terminal shows a GET /health log line

  Scenario: Auth request reaches backend
    Tool: Expo Go + backend terminal
    Steps:
      1) In app, register/login
    Expected:
      - Backend terminal shows POST /auth/register or POST /auth/login
  ```

- [ ] 2. If phone still can’t reach backend, fix network/firewall (Windows)

  **What to do**:
  1) Confirm backend is listening:
     - `netstat -ano | findstr :8000`
  2) Confirm same Wi‑Fi:
     - Phone and PC both on `192.168.3.x` network.
  3) Allow inbound port 8000 on Windows Defender Firewall:
     - Create inbound TCP rule for local port `8000` (Public/Private as appropriate).
  4) Re-test `/health` from phone browser.

  **Recommended Agent Profile**:
  - Category: `unspecified-low` — environment/network troubleshooting
  - Skills: []

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: — | Blocked By: 1

  **Acceptance Criteria**:
  - [ ] Phone browser reaches `/health` and backend logs the request.

- [x] 3. Migrate UST Dash jump SFX from `expo-av` → `expo-audio` (SDK 54 compliant)

  **What to do**:
  1) Install new package:
     - `npx expo install expo-audio`
  2) Update `mobile/src/screens/USTDashScreen.tsx`:
     - Replace `import { Audio } from 'expo-av'` with `import { useAudioPlayer } from 'expo-audio'`.
     - Create player:
       - `const player = useAudioPlayer(require('../../assets/ust-dash-jump.mp3'))`
     - On tap:
       - `player.seekTo(0); player.play();`
     - Remove load/unload `Audio.Sound.createAsync` code.
  3) Remove `expo-av` dependency from `mobile/package.json` if it’s no longer used anywhere.
  4) Restart Metro.

  **Must NOT do**:
  - Don’t keep both `expo-av` and `expo-audio` unless another feature still uses `expo-av`.

  **Recommended Agent Profile**:
  - Category: `quick` — isolated screen change
  - Skills: []

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 4 | Blocked By: —

  **References**:
  - Current usage: `mobile/src/screens/USTDashScreen.tsx` imports `expo-av`.
  - Expo SDK 54 docs (expo-audio): https://github.com/expo/expo/blob/sdk-54/docs/pages/versions/unversioned/sdk/audio.mdx

  **Acceptance Criteria**:
  - [ ] Metro console no longer shows `WARN [expo-av]: Expo AV has been deprecated...`.
  - [ ] Jump sound plays on each tap.

  **QA Scenarios**:
  ```
  Scenario: Jump sound plays repeatedly
    Tool: Expo Go
    Steps:
      1) Enter UST Dash
      2) Tap repeatedly
    Expected:
      - Each tap plays jump SFX (including after sound finished)

  Scenario: No deprecation warning
    Tool: Metro console
    Steps:
      1) Start app
    Expected:
      - No expo-av deprecation warning present
  ```

- [x] 4. Re-run TypeScript verification

  **What to do**:
  - In `mobile/`: `npx tsc --noEmit`

  **Recommended Agent Profile**:
  - Category: `quick`
  - Skills: []

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: — | Blocked By: 1,3

  **Acceptance Criteria**:
  - [ ] `npx tsc --noEmit` exits 0.

## Final Verification Wave
- [ ] F1. Connectivity sanity check — open `/health` from phone
- [ ] F2. Auth E2E check — register/login produces backend logs
- [ ] F3. UST Dash audio check — jump SFX works, no deprecation warning
- [ ] F4. Type check — `npx tsc --noEmit`

## Notes / Defaults Applied
- Defaulted to **auto-detect** from Expo hostUri so home+dorm works automatically.
- If you use Expo tunnel mode (hostUri includes `expo.dev`) or remote devices, you MUST set `EXPO_PUBLIC_API_BASE_URL` (or use Tailscale per alternative option).
