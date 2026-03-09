# Allow orderer cancel on accepted + show takeaway-only toast once

## TL;DR
> **Summary**: Align mobile UI with existing backend cancellation rules (allow cancel in `pending` or `accepted`, not after `picked_up`) and replace the canteen WebView spammy “Takeaway Only” Alert with a single Toast shown once on the first **user-initiated** takeaway (外賣) click.
> **Deliverables**:
> - Mobile: Cancel button visible for orderer when order status is `pending` **or** `accepted`.
> - Mobile: Canteen WebView sends a single `takeaway_selected` message; RN shows one toast (no `Alert.alert('Takeaway Only', ...)`).
> - Verification: `npx tsc --noEmit` passes; static grep/assert checks for the updated conditions.
> **Effort**: Short
> **Parallel**: YES — 2 waves
> **Critical Path**: Update injected JS + RN message handling → typecheck

## Context
### Original Request
- “user's order is accepted by a deliverer but the user can still cancel the order but after the deliverer marked as pick up then can't”
- “if the user click the takeaway button and then you pop out the error once only”

### Interview Summary
- Backend already enforces cancellation allowed only when status is `pending` or `accepted` (and rejects after `picked_up`).
- Mobile currently only shows Cancel action for `pending`; needs to include `accepted`.
- User confirmed:
  - Trigger for takeaway notice: **On Takeaway click**.
  - Notice UI: **Toast** (ToastContext), not Alert modal.

### Metis Review (gaps addressed)
- Keep backend cancellation rules unchanged; only align mobile UI.
- Avoid refactoring QR/cart extraction beyond the dine-in/takeaway notice path.
- Ensure toast wiring exists in `CanteenWebViewScreen` (currently not using ToastContext).
- Prevent repeated toasts via **both** injected-JS dedupe and RN-side `useRef` guard.

## Work Objectives
### Core Objective
Implement the requested UX changes without altering backend business rules or destabilizing the WebView QR/cart extraction logic.

### Deliverables
1) **Cancel UI alignment**: Orderer can cancel when order is `pending` or `accepted` (still blocked by backend after `picked_up`).
2) **Takeaway notice fix**: Replace repeated `Alert.alert('Takeaway Only'...)` with a one-time toast shown on first user-initiated takeaway click, with message traffic deduped.

### Definition of Done (verifiable)
- `cd mobile && npx tsc --noEmit` succeeds.
- `mobile/src/screens/OrderDetailScreen.tsx` cancel gating includes `accepted`.
- `mobile/src/screens/CanteenWebViewScreen.tsx`:
  - no longer shows `Alert.alert('Takeaway Only', ...)`.
  - handles `takeaway_selected` message by showing toast once.
- Injected JS in `CanteenWebViewScreen`:
  - does **not** attach duplicate click listeners on repeated DOM mutations.
  - posts `takeaway_selected` at most once per screen mount/page load.

### Must Have
- No backend changes required for cancellation logic.
- No new dependencies.
- No `any` types; keep TS strict.

### Must NOT Have (guardrails)
- Do not refactor the QR capture strategies or cart scraping logic except where strictly necessary to add dine-in/takeaway listener dedupe.
- Do not add test frameworks (none exist) or invoke non-existent tools (jest/pytest/eslint/ruff).
- Do not replace the cancel confirmation prompt with a toast (keep confirmation flow intact).

## Verification Strategy
> ZERO HUMAN INTERVENTION — all verification is agent-executed.
- Test decision: **tests-after** (no test frameworks). Use:
  - Frontend: `npx tsc --noEmit`
  - Static assertions via `python - <<'PY' ... PY`
  - Optional backend smoke checks via curl/python only if backend+DB are running.
- Evidence: store command outputs in `.sisyphus/evidence/` as referenced in each task.

## Execution Strategy
### Parallel Execution Waves
Wave 1 (in parallel):
- T1: Cancel button gating update (OrderDetail)
- T2: WebView injected JS dedupe + new message type (`takeaway_selected`)

Wave 2:
- T3: RN handleMessage: ToastContext + one-time toast + remove Takeaway alert branch
- T4: Verification suite (static checks + TS typecheck; optional backend smoke)

### Dependency Matrix
- T1 blocks: none
- T2 blocks: T3 (RN must handle new message type)
- T3 blocks: T4

### Agent Dispatch Summary
- Wave 1: 2 tasks → `quick` (TS edits) and `unspecified-low` (WebView injected JS; riskier)
- Wave 2: 2 tasks → `quick`

## TODOs
> Implementation + Verification = ONE task. Never separate.

- [x] 1. Mobile: allow orderer cancel when status is `pending` OR `accepted`

  **What to do**:
  - Edit `mobile/src/screens/OrderDetailScreen.tsx` to show the Cancel button for orderer when:
    - `order.status === 'pending' || order.status === 'accepted'`.
  - Keep the existing cancel confirmation prompt text (do not change to toast).
  - Do not change deliverer action buttons.

  **Must NOT do**:
  - Do not change backend cancellation logic.
  - Do not expose cancel action for statuses `picked_up`, `delivered`, `cancelled`.

  **Recommended Agent Profile**:
  - Category: `quick` — small TS condition change.
  - Skills: none

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: none | Blocked By: none

  **References**:
  - Pattern: `mobile/src/screens/OrderDetailScreen.tsx:488-530` — action buttons; cancel gating currently pending-only.
  - Backend contract: `backend/services/order_service.py:209-238` — cancel allowed only for `("pending", "accepted")`.

  **Acceptance Criteria**:
  - [ ] Static assertion passes:
    ```bash
    python - <<'PY'
    p=r"mobile/src/screens/OrderDetailScreen.tsx"
    s=open(p,"r",encoding="utf-8").read()
    assert "isOrderer && order.status === 'pending'" not in s, "still pending-only"
    assert ("order.status === 'accepted'" in s) or ("order.status === \"accepted\"" in s), "missing accepted condition"
    print("OK: cancel gating includes accepted")
    PY
    ```
  - [ ] Typecheck passes:
    ```bash
    cd mobile && npx tsc --noEmit
    ```

  **QA Scenarios**:
  ```
  Scenario: Cancel button appears for accepted order (static)
    Tool: Bash (python)
    Steps: Run the static assertion above
    Expected: Script prints OK and exits 0
    Evidence: .sisyphus/evidence/task-1-cancel-gating.txt

  Scenario: Cancel button absent for picked_up order (static)
    Tool: Bash (python)
    Steps: Confirm the render condition does not include picked_up; grep for "picked_up" in the cancel gating block
    Expected: No conditional enabling cancel for picked_up
    Evidence: .sisyphus/evidence/task-1-cancel-no-picked-up.txt
  ```

  **Commit**: NO | Message: n/a | Files: n/a

- [x] 2. WebView injected JS: dedupe listeners; emit `takeaway_selected` once on user-initiated takeaway click

  **What to do**:
  - In `mobile/src/screens/CanteenWebViewScreen.tsx`, inside the injected JS string where the dine-in blocker is defined (currently labeled `// === Dine-in Blocker ===`):
    1) **Prevent re-initialization** across repeated injections/DOM mutations by using a global flag, e.g.:
       - `window.__deliveru_dinein_blocker_initialized = true`
    2) **Listener dedupe**:
       - When attaching a click handler to a matching element, first check/set a marker on the element (dataset attribute is preferred), e.g.:
         - `elem.dataset.deliveruDineinBound = '1'`
         - `elem.dataset.deliveruTakeawayBound = '1'`
    3) **Change message strategy** to match desired UX:
       - **Do not show any notice** on dine-in (堂食) click.
       - Prefer to stop sending `{ type: 'dine_in_blocked' }` entirely.
       - Add a click handler for the takeaway option (外賣) that posts `{ type: 'takeaway_selected' }` **only once** per page load, guarded by:
         - `window.__deliveru_takeaway_selected_sent = true`
       - Only fire for **user-initiated** clicks:
         - if `typeof event.isTrusted === 'boolean'` and `event.isTrusted !== true`, return early
         - this prevents the existing programmatic `elem.click()` auto-select from triggering the toast.
    4) Keep dine-in blocking behavior (prevent dine-in selection) but do not show any notice on dine-in click.
  - Ensure the MutationObserver does not continuously add duplicate handlers.

  **Must NOT do**:
  - Do not touch QR capture logic except for minimal edits required to add this dedupe/message behavior.
  - Do not add external libraries.

  **Recommended Agent Profile**:
  - Category: `unspecified-low` — careful JS-in-string edits.
  - Skills: none

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: T3 | Blocked By: none

  **References**:
  - Injected JS section: `mobile/src/screens/CanteenWebViewScreen.tsx:775-846` — current `blockDineIn()` implementation + MutationObserver.
  - Current message: `mobile/src/screens/CanteenWebViewScreen.tsx:925-931` — `dine_in_blocked` handled via Alert.

  **Acceptance Criteria**:
  - [ ] Static check: `takeaway_selected` message exists in injected JS:
    ```bash
    python - <<'PY'
    p=r"mobile/src/screens/CanteenWebViewScreen.tsx"
    s=open(p,"r",encoding="utf-8").read()
    assert "takeaway_selected" in s, "missing takeaway_selected message"
    print("OK: takeaway_selected present")
    PY
    ```
  - [ ] Static check: no Takeaway-only Alert remains on RN side:
    ```bash
    python - <<'PY'
    p=r"mobile/src/screens/CanteenWebViewScreen.tsx"
    s=open(p,"r",encoding="utf-8").read()
    assert "Alert.alert(\n          'Takeaway Only'" not in s, "still has Takeaway Only Alert"
    print("OK: no Takeaway Only Alert")
    PY
    ```

  **QA Scenarios**:
  ```
  Scenario: Listener dedupe guard present (static)
    Tool: Bash (python)
    Steps: Assert file contains a global init flag and an element marker (dataset/property)
    Expected: Both strings present; indicates dedupe implemented
    Evidence: .sisyphus/evidence/task-2-webview-dedupe-static.txt

  Scenario: take-away event is one-shot (static)
    Tool: Bash (python)
    Steps: Assert file contains a one-shot guard variable for takeaway postMessage
    Expected: Guard exists (e.g., __deliveru_takeaway_selected_sent)
    Evidence: .sisyphus/evidence/task-2-webview-once-guard.txt
  ```

  **Commit**: NO | Message: n/a | Files: n/a

- [x] 3. RN WebView handler: show a Toast once on `takeaway_selected`; remove Takeaway-only Alert

  **What to do**:
  - In `mobile/src/screens/CanteenWebViewScreen.tsx`:
    - Import and use `useToast` from `mobile/src/context/ToastContext`.
    - Add `const { showToast } = useToast();`.
    - Add a `useRef(false)` guard, e.g. `hasShownTakeawayToastRef`.
    - In `handleMessage`, add a branch for `msg.type === 'takeaway_selected'`:
      - if guard false: `showToast('This app only supports takeaway orders.', 'warning')`; set guard true.
      - return.
    - Remove the `Alert.alert('Takeaway Only', ...)` branch tied to `dine_in_blocked`.
    - Optional safety: keep a `dine_in_blocked` branch that just `return;` (ignore) in case old messages still arrive.
  - Ensure `handleMessage`’s `useCallback` dependency array includes `showToast`.

  **Must NOT do**:
  - Do not replace other Alerts (QR capture failures/timeouts) with toasts.

  **Recommended Agent Profile**:
  - Category: `quick` — small TS wiring change.
  - Skills: none

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: T4 | Blocked By: T2

  **References**:
  - Toast pattern: `mobile/src/context/ToastContext.tsx` — `showToast(message, type)`.
  - Current Alert branch: `mobile/src/screens/CanteenWebViewScreen.tsx:925-931`.

  **Acceptance Criteria**:
  - [ ] Static check: `useToast` is used and Takeaway alert removed:
    ```bash
    python - <<'PY'
    p=r"mobile/src/screens/CanteenWebViewScreen.tsx"
    s=open(p,"r",encoding="utf-8").read()
    assert "useToast" in s, "useToast not imported/used"
    assert "takeaway_selected" in s, "no takeaway_selected handler"
    assert "Alert.alert(\n          'Takeaway Only'" not in s, "Takeaway Only Alert still present"
    print("OK: toast wiring and no Takeaway Only alert")
    PY
    ```
  - [ ] Typecheck passes:
    ```bash
    cd mobile && npx tsc --noEmit
    ```

  **QA Scenarios**:
  ```
  Scenario: One-time toast guard exists (static)
    Tool: Bash (python)
    Steps: Assert file contains a hasShownTakeawayToast ref and only sets it once
    Expected: Guard found; toast call gated
    Evidence: .sisyphus/evidence/task-3-toast-guard.txt

  Scenario: No modal spam path remains (static)
    Tool: Bash (python)
    Steps: Search file for Alert.alert with "Takeaway" wording
    Expected: No matches
    Evidence: .sisyphus/evidence/task-3-no-takeaway-alert.txt
  ```

  **Commit**: NO | Message: n/a | Files: n/a

- [x] 4. Verification wave: run TS typecheck + (optional) backend smoke checks

  **What to do**:
  - Run `cd mobile && npx tsc --noEmit`.
  - Run the static python assertions from Tasks 1–3 and save outputs.
  - Optional (only if backend+DB already running): run backend smoke checks to confirm cancel works for accepted and fails for picked_up.

  **Must NOT do**:
  - Do not add pytest/jest.

  **Recommended Agent Profile**:
  - Category: `quick`
  - Skills: none

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: none | Blocked By: T3

  **References**:
  - Backend cancellation: `backend/services/order_service.py:209-238`
  - Backend endpoint: `backend/routers/orders.py:216-226`

  **Acceptance Criteria**:
  - [ ] `cd mobile && npx tsc --noEmit` exits 0.
  - [ ] Static assertions for Tasks 1–3 exit 0.
  - [ ] (Optional) Backend smoke checks:
    - `GET http://localhost:8000/health` returns `{ "status": "ok" }`.
    - Cancel accepted returns 200; cancel picked_up returns 400.

  **QA Scenarios**:
  ```
  Scenario: Frontend typecheck
    Tool: Bash
    Steps: cd mobile && npx tsc --noEmit
    Expected: Exit code 0
    Evidence: .sisyphus/evidence/task-4-tsc.txt

  Scenario: Backend cancel-after-pickup rejected (optional)
    Tool: Bash (python)
    Steps: Run a python script that registers 2 users, creates order, accepts, picks up, attempts cancel
    Expected: HTTP 400 with detail mentioning pending/accepted
    Evidence: .sisyphus/evidence/task-4-backend-cancel-reject.txt
  ```

  **Commit**: NO | Message: n/a | Files: n/a

## Final Verification Wave (4 parallel agents, ALL must APPROVE)
- [ ] F1. Plan Compliance Audit — oracle
- [ ] F2. Code Quality Review — unspecified-high
- [ ] F3. Real Manual QA — unspecified-high (Expo run; validate toast shows once on takeaway click)
- [ ] F4. Scope Fidelity Check — deep

## Commit Strategy
- Default: **NO commits** unless user explicitly requests.
- If requested, use 2 atomic commits:
  1) `fix(mobile): allow cancel for accepted orders`
  2) `fix(mobile): show one-time takeaway toast in canteen webview`

## Success Criteria
- Orderer sees “Cancel Order” button for `pending` and `accepted` orders; backend remains the source of truth and continues rejecting cancel after `picked_up`.
- Canteen WebView no longer spams blocking modals; a single toast appears once on first user takeaway click.
- `npx tsc --noEmit` passes.
