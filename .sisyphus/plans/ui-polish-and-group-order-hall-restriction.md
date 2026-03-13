# UI Polish + Group Order Hall Restriction

## TL;DR
> **Summary**: Fix several UI spacing/alignment issues (top thin blue strip, leaderboard toggle spacing, Lucky Draw wheel styling + pointer direction, deliverer filter label centering) and restrict Group Orders to the user’s own dorm hall (see + join), enforced frontend + backend.
> **Deliverables**:
> - iOS top thin light-blue strip removed (no “always-on” sliver)
> - Leaderboard toggle moved down from the header title
> - Lucky Draw wheel matches theme palette + pointer points correctly
> - DelivererQueue “Group Orders Only” label visually centered
> - Group Orders hall board locked to user’s hall; join/detail blocked cross-hall; missing hall disables feature with prompt
> **Effort**: Medium
> **Parallel**: YES — 2 waves
> **Critical Path**: Backend hall enforcement → Frontend 403 handling → Verification

## Context
### Original Request
- Top of app: “very thin small light blue bar” — move it higher / remove.
- Leaderboard: move toggle down; too close to title.
- Lucky Draw wheel: align with UI; pointer triangle wrong direction → rotate 180°.
- Group Orders: only see and join your own hall orders.
- Deliverer queue: “Group Orders Only” button text not centered.

### Interview Summary
- Top thin blue strip reproduces on **iOS only**.
- Group Orders restriction should also block **Group Order Detail** cross-hall (403).
- If user has **no dorm hall** set, **disable Group Orders + prompt to set hall**.

### Metis Review (gaps addressed)
- Automated visual verification is limited in this repo; plan uses (1) type-check, (2) backend curl smoke checks, and (3) deterministic code-level guarantees (e.g., toast unmounted when hidden).
- Avoid scope creep: do not redesign screens beyond requested spacing/styling alignment.

## Work Objectives
### Core Objective
Implement the requested UI polish changes and hall-based Group Orders restrictions with backend enforcement to prevent bypass.

### Definition of Done (verifiable)
- Mobile TypeScript: `cd mobile && npx tsc --noEmit` succeeds.
- Backend: all three hall protections work via curl:
  - list open group orders returns only user’s hall
  - group detail returns 403 cross-hall
  - join returns 403 cross-hall
- Code-level: Toast component cannot leave any visible pixels when not visible (either unmounted or translated fully off-screen).

### Must Have
- No new dependencies.
- Backend enforcement (not only frontend filtering).
- Friendly user-facing messaging on 403 (detail/join) and missing hall.

### Must NOT Have (guardrails)
- Do NOT restrict DelivererQueue browsing beyond existing preferred-halls filter.
- Do NOT change non-group order flows.
- Do NOT commit secrets or touch `.env`.

## Verification Strategy
> ZERO HUMAN INTERVENTION target. Given this is React Native and iOS-only visual behavior, verification uses deterministic code checks + type-check + backend curl smoke tests.
- Frontend automated check: `cd mobile && npx tsc --noEmit`
- Backend smoke checks: run server + curl (see Task 6)
- Evidence policy: save terminal outputs to `.sisyphus/evidence/` as specified per task.

## Execution Strategy
### Parallel Execution Waves

Wave 1 (parallel foundation)
- Backend hall enforcement (list/detail/join)
- Toast top-strip fix
- UI spacing/alignment changes (leaderboard, lucky draw, deliverer button)
- Frontend Group Orders UX lock + missing-hall prompt + 403 handling

Wave 2 (verification)
- Type-check
- Backend curl verification

### Dependency Matrix (high-level)
- Backend enforcement blocks/feeds frontend 403-handling verification.
- Toast change independent.
- UI tweaks independent.

### Agent Dispatch Summary
- Wave 1: 5 tasks across `unspecified-high` (RN UI) + `deep` (backend authorization correctness)
- Wave 2: 2 tasks `quick` (commands/verification)

## TODOs
> Implementation + Test/Verification = ONE task.

- [x] 1. Fix iOS “thin light-blue bar” by eliminating hidden Toast sliver

  **What to do**:
  - Implement **Unmount-when-hidden** (single chosen approach):
    - In `mobile/src/context/ToastContext.tsx`:
      - Add `mounted: boolean` state.
      - In `showToast(...)`: set message/type, set `mounted=true`, then set `visible=true`.
      - In `hideToast()`: set `visible=false` only.
      - Render `<Toast />` only when `mounted === true`.
    - In `mobile/src/components/Toast.tsx`:
      - Add an optional prop `onHidden?: () => void`.
      - On `visible === false`, run the slide-up animation, and in `.start(() => onHidden?.())` call back to provider.
      - In provider, pass `onHidden={() => setMounted(false)}`.
      - Replace `marginTop: Platform.OS === 'ios' ? 50 : 20` with safe-area insets:
        - `const insets = useSafeAreaInsets();`
        - `marginTop: insets.top + t.spacing.md`
  - Root cause eliminated: initial toast (type defaults to `info` → `#5AC8FA`) is no longer rendered when hidden, so there is no always-on top sliver.

  **Must NOT do**:
  - Do not change AppHeader layout to “mask” the issue.
  - Do not add new libraries.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` — Reason: RN absolute positioning + animation layout
  - Skills: none

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: none | Blocked By: none

  **References**:
  - Source: `mobile/src/components/Toast.tsx` — hidden state uses `translateY=-100` + `marginTop=50`.
  - Source: `mobile/src/context/ToastContext.tsx` — Toast always mounted.
  - Pattern: `mobile/src/components/AppHeader.tsx` — uses safe-area insets top.

  **Acceptance Criteria**:
  - [ ] Toast is **not mounted** when `visible === false` (after hide animation completes).
  - [ ] `cd mobile && npx tsc --noEmit` passes.

  **QA Scenarios**:
  ```
  Scenario: Toast hidden cannot show sliver
    Tool: Bash (static verification) + Type-check
    Steps:
      1) Inspect updated Toast/ToastContext logic to confirm (a) unmounted when hidden OR (b) hidden translateY uses insets + large negative offset and opacity 0.
      2) Run: cd mobile && npx tsc --noEmit
    Expected:
      - No code path leaves Toast rendered at top with a small visible region when visible=false
      - Type-check succeeds
    Evidence: .sisyphus/evidence/task-1-toast-fix.txt

  Scenario: Show then hide animation still works
    Tool: Bash (reasoning + optional run logs)
    Steps:
      1) Trigger showToast from an existing caller (e.g., an error path) while running app in Expo.
      2) Confirm toast animates down then fully disappears.
    Expected: Toast displays and fully disappears (no persistent top strip).
    Evidence: .sisyphus/evidence/task-1-toast-show-hide-notes.txt
  ```

  **Commit**: YES | Message: `fix(ui): remove hidden toast top sliver on iOS` | Files: `mobile/src/components/Toast.tsx`, `mobile/src/context/ToastContext.tsx`

- [x] 2. Add vertical spacing between Leaderboard header and toggle

  **What to do**:
  - In `mobile/src/screens/LeaderboardScreen.tsx`, add `marginTop: t.spacing.md` to `styles.toggleContainer`.
  - Keep existing `marginHorizontal: 16` and `marginBottom: 16`.

  **Must NOT do**:
  - Do not change AppHeader’s padding (global impact).

  **Recommended Agent Profile**:
  - Category: `visual-engineering` — Reason: small layout tweak
  - Skills: none

  **Parallelization**: Can Parallel: YES | Wave 1

  **References**:
  - Source: `mobile/src/screens/LeaderboardScreen.tsx` — toggle container directly under AppHeader.

  **Acceptance Criteria**:
  - [ ] Toggle container has explicit top spacing from AppHeader.
  - [ ] `cd mobile && npx tsc --noEmit` passes.

  **QA Scenarios**:
  ```
  Scenario: Toggle no longer touches title area
    Tool: Bash + (optional Expo run)
    Steps:
      1) Verify style change exists in LeaderboardScreen.
      2) Run: cd mobile && npx tsc --noEmit
    Expected: Style spacing added; type-check passes.
    Evidence: .sisyphus/evidence/task-2-leaderboard-spacing.txt

  Scenario: Both tabs still toggle
    Tool: Bash (optional Expo run)
    Steps:
      1) Open Leaderboard and tap Orderers/Deliverers.
    Expected: Toggle works; spacing unchanged across tabs.
    Evidence: .sisyphus/evidence/task-2-leaderboard-toggle-notes.txt
  ```

  **Commit**: YES | Message: `fix(ui): add spacing above leaderboard toggle` | Files: `mobile/src/screens/LeaderboardScreen.tsx`

- [x] 3. Lucky Draw wheel: align styling with theme + rotate pointer 180°

  **What to do**:
  - In `mobile/src/screens/LuckyDrawWheelScreen.tsx`:
    - Replace hard-coded `SEGMENT_COLORS` with theme palette equivalents:
      - Use: `t.colors.orange`, `t.colors.info` (or `t.colors.teal`), `t.colors.purple`, `t.colors.success`.
    - Wrap wheel in a card-like surface consistent with other screens:
      - Outer container: `backgroundColor: t.colors.card`, `borderRadius: t.radius.xl` (or lg), `padding`, `t.shadow.card`.
      - Optional: add subtle border `borderColor: t.colors.border`, `borderWidth: 1`.
    - Fix pointer direction:
      - Change pointer style to a **downward** triangle using `borderTopWidth: 20` + `borderTopColor: t.colors.text` and remove `borderBottomWidth`.
      - Maintain the existing selection math (lines computing `pointerAngle` and `idx` stay unchanged).

  **Must NOT do**:
  - Do not change the random selection algorithm.
  - Do not add new SVG libraries.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` — Reason: UI alignment and SVG styling
  - Skills: none

  **Parallelization**: Can Parallel: YES | Wave 1

  **References**:
  - Source: `mobile/src/screens/LuckyDrawWheelScreen.tsx` — `SEGMENT_COLORS` hard-coded; pointer style uses borderBottom triangle.
  - Theme palette: `mobile/src/constants/theme.ts` — `orange/info/purple/success`.

  **Acceptance Criteria**:
  - [ ] Pointer triangle points down into the wheel.
  - [ ] Segment colors come from `t.colors.*` (no hard-coded `#5AC8FA` etc.).
  - [ ] `cd mobile && npx tsc --noEmit` passes.

  **QA Scenarios**:
  ```
  Scenario: Pointer direction corrected
    Tool: Bash (static) + Type-check
    Steps:
      1) Confirm pointer uses borderTop (or rotate 180deg).
      2) Run: cd mobile && npx tsc --noEmit
    Expected: Pointer implementation points down; type-check passes.
    Evidence: .sisyphus/evidence/task-3-lucky-draw-pointer.txt

  Scenario: Wheel still produces a result
    Tool: Bash (optional Expo run)
    Steps:
      1) Spin wheel multiple times.
    Expected: Result is set to one of CANTEENS; UI styling unchanged.
    Evidence: .sisyphus/evidence/task-3-lucky-draw-spin-notes.txt
  ```

  **Commit**: YES | Message: `fix(ui): theme lucky draw wheel and correct pointer direction` | Files: `mobile/src/screens/LuckyDrawWheelScreen.tsx`

- [x] 4. DelivererQueue “Group Orders Only” filter: make label visually centered

  **What to do**:
  - In `mobile/src/screens/DelivererQueueScreen.tsx`, adjust `groupFilterBtn` so the text appears centered within the pill even with the left icon present.
  - Decision: use **absolute-position icon** + centered text:
    - Set `groupFilterBtn` to `position: 'relative'`.
    - Set icon style to `position: 'absolute'`, `left: 16`.
    - Set Text style to `width: '100%'` and `textAlign: 'center'`.
    - Keep touch target height and padding unchanged.

  **Must NOT do**:
  - Do not remove the icon.

  **Recommended Agent Profile**:
  - Category: `visual-engineering`
  - Skills: none

  **Parallelization**: Can Parallel: YES | Wave 1

  **References**:
  - Source: `mobile/src/screens/DelivererQueueScreen.tsx` — `groupFilterBtn` uses row layout; icon margin shifts visual centering.

  **Acceptance Criteria**:
  - [ ] Text “Group Orders Only” is centered within the pill (icon stays left).
  - [ ] `cd mobile && npx tsc --noEmit` passes.

  **QA Scenarios**:
  ```
  Scenario: Label centered with icon
    Tool: Bash (static) + Type-check
    Steps:
      1) Confirm icon is absolutely positioned and text is centered.
      2) Run: cd mobile && npx tsc --noEmit
    Expected: Layout change present; type-check passes.
    Evidence: .sisyphus/evidence/task-4-deliverer-group-filter.txt

  Scenario: Toggle still works
    Tool: Bash (optional Expo run)
    Steps:
      1) Tap filter on/off.
    Expected: Group-only filtering still occurs.
    Evidence: .sisyphus/evidence/task-4-deliverer-group-filter-toggle-notes.txt
  ```

  **Commit**: YES | Message: `fix(ui): center deliverer group-only filter label` | Files: `mobile/src/screens/DelivererQueueScreen.tsx`

- [x] 5. Frontend: lock Group Orders to user’s hall; handle missing hall + cross-hall 403

  **What to do**:
  - Dashboard entrypoint (`mobile/src/screens/DashboardScreen.tsx`):
    - Apply the same behavior to **both** Group Orders cards (orderer view and deliverer view).
    - If `user?.dorm_hall` is falsy:
      - Render the card in a “disabled” visual state (e.g., reduce opacity + use muted background).
      - Replace the subtitle with: “Set your dorm hall in Profile to use Group Orders”.
      - On press: `Alert.alert('Dorm hall required', 'Set your dorm hall in Edit Profile to use Group Orders.', [{ text: 'Edit Profile', onPress: () => navigation.navigate('EditProfile') }, { text: 'Cancel', style: 'cancel' }])`.
    - If `user?.dorm_hall` is set, keep existing navigation to `GroupOrdersHallBoard`.
  - Hall board (`mobile/src/screens/GroupOrdersHallBoardScreen.tsx`):
    - Import `useAuth()` and derive `const hall = user?.dorm_hall`.
    - Remove `HALL_FILTERS`, chips, and `selectedHall` state entirely.
    - If no hall: render a friendly empty/prompt state + button to navigate to `EditProfile`.
    - If hall exists: call `getOpenGroupOrders(hall)` only.
  - Detail and join screens (`GroupOrderDetailScreen.tsx`, `GroupOrderJoinScreen.tsx`):
    - Update catch blocks to receive the error object.
    - Use `axios.isAxiosError(err)` and inspect `err.response?.status`.
    - For 403: show a specific message (“You can only view/join group orders from your own hall.”) and navigate back.
    - Keep generic error message for other failures.

  **Must NOT do**:
  - Do not add new navigation routes; reuse existing `EditProfile`.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: multi-screen UX + error handling
  - Skills: none

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocked By: Task 6 (for end-to-end verification only)

  **References**:
  - Auth state: `mobile/src/context/AuthContext.tsx` — `user` is available.
  - Dashboard navigation: `mobile/src/screens/DashboardScreen.tsx` — Group Orders card navigates to `GroupOrdersHallBoard`.
  - Hall board: `mobile/src/screens/GroupOrdersHallBoardScreen.tsx` — currently uses chips and `getOpenGroupOrders(hall?)`.
  - Detail/join API: `mobile/src/api/groupOrders.ts`.
  - Axios client: `mobile/src/api/client.ts` (axios already in project).

  **Acceptance Criteria**:
  - [ ] If `user.dorm_hall` missing: Group Orders entry is disabled + prompts user to set hall.
  - [ ] Hall board always loads with hall = `user.dorm_hall` (no “All” or other halls selectable).
  - [ ] On 403 from detail/join: user sees a specific message and is navigated away safely.
  - [ ] `cd mobile && npx tsc --noEmit` passes.

  **QA Scenarios**:
  ```
  Scenario: Missing hall blocks group orders
    Tool: Bash (static) + (optional Expo run)
    Steps:
      1) Ensure code path exists that disables Group Orders card when user.dorm_hall is falsy.
    Expected: User is prompted to set hall; cannot enter hall board.
    Evidence: .sisyphus/evidence/task-5-missing-hall-ui.txt

  Scenario: Cross-hall 403 handled
    Tool: Bash (static)
    Steps:
      1) Confirm axios error handling checks for response status 403.
    Expected: Specific alert and navigation back are implemented.
    Evidence: .sisyphus/evidence/task-5-403-handling.txt
  ```

  **Commit**: YES | Message: `feat(group-orders): lock board to user hall and handle cross-hall access` | Files: `mobile/src/screens/DashboardScreen.tsx`, `mobile/src/screens/GroupOrdersHallBoardScreen.tsx`, `mobile/src/screens/GroupOrderDetailScreen.tsx`, `mobile/src/screens/GroupOrderJoinScreen.tsx`

- [x] 6. Backend: enforce group-order hall restrictions (list + detail + join)
- [x] 6. Backend: enforce group-order hall restrictions (list + detail + join + accept)

  **What to do**:
  - Hall-open list (`backend/routers/orders.py` → `GET /orders/group/hall-open`):
    - Ignore the incoming `hall` query param for authorization purposes.
    - If `user.dorm_hall` is falsy: return empty list `[]` (200) to avoid leaking other halls.
    - Otherwise call `get_hall_open_group_orders(db, hall=user.dorm_hall)`.
  - Group detail (`backend/routers/orders.py` → `GET /orders/group/{root_order_id}`):
    - After loading `root`, if `user.dorm_hall` is falsy → raise `HTTPException(status.HTTP_403_FORBIDDEN, "Dorm hall required")`.
    - If `root.delivery_hall != user.dorm_hall`, allow only if:
      - user is the root orderer (`root.orderer_id == user.id`), OR
      - user is already a participant (exists Order with `group_order_id == root_order_id` and `orderer_id == user.id` and not cancelled), OR
      - user is assigned deliverer for the root (`root.deliverer_id == user.id`)
      - else 403.
  - Join (`backend/services/order_service.py` → `join_group_order`):
    - Before creating joiner order, enforce:
      - if no `user.dorm_hall` → 403
      - if `user.dorm_hall != root_order.delivery_hall` → 403 with clear message

  **Must NOT do**:
  - Do not change DelivererQueue (`/orders/queue`) behavior.
  - Do not commit inside services (follow existing convention).

  **Recommended Agent Profile**:
  - Category: `deep` — Reason: authorization edge cases and preventing bypass
  - Skills: none

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: Task 5 (end-to-end verification), Task 7

  **References**:
  - Router list endpoint: `backend/routers/orders.py` (`get_open_group_orders`)
  - Router detail endpoint: `backend/routers/orders.py` (`get_group_order_detail`)
  - Join service: `backend/services/order_service.py` (`join_group_order`)
  - Existing hall field usage: `backend/services/order_service.py` (`accept_order` hall conflict message)

  **Acceptance Criteria**:
  - [ ] `/orders/group/hall-open` only returns orders where `delivery_hall == user.dorm_hall`.
  - [ ] `/orders/group/{id}` returns 403 for cross-hall users who are not owner/participant/deliverer.
  - [ ] `/orders/group/{id}/join` returns 403 for cross-hall join attempts.
  - [ ] `/orders/group/{id}/accept` returns 403 for cross-hall accept attempts.
  - [ ] Server still starts: `cd backend && uvicorn main:app --reload`.

  **QA Scenarios**:
  ```
  Scenario: Cross-hall user cannot list other hall group orders
    Tool: Bash
    Steps:
      1) Run backend.
      2) Authenticate as User A (Hall I) and User B (Hall II).
      3) Call GET /orders/group/hall-open with each token.
    Expected: Each user only sees their own hall’s open group orders.
    Evidence: .sisyphus/evidence/task-6-hall-open-curl.txt

  Scenario: Cross-hall user cannot view detail or join
    Tool: Bash
    Steps:
      1) With User B token, call GET /orders/group/{rootOrderId} for a Hall I root.
      2) With User B token, call POST /orders/group/{rootOrderId}/join.
    Expected: Both return 403 with clear message.
    Evidence: .sisyphus/evidence/task-6-detail-join-403-curl.txt
  ```

  **Curl recipes (copy/paste)**:
  - Register/login to obtain tokens:
    - `POST /auth/register` body: `{ "email": "u1@connect.ust.hk", "password": "Passw0rd!" }`
    - `POST /auth/login` body: `{ "email": "u1@connect.ust.hk", "password": "Passw0rd!" }`
    - Use returned `access_token` as `Authorization: Bearer <token>`.
  - (If needed) set dorm hall via existing user update endpoint in `backend/routers/users.py` (executor must locate the exact route and payload and use it for the two test users).

    Concrete endpoint/payload for setting hall (from `backend/routers/users.py`):
    - `PUT /users/me/profile`
    - Requires the full `ProfileSetupRequest` payload (not partial). Minimal valid payload for an orderer:
      ```json
      {
        "nickname": "u1",
        "dorm_hall": "Hall I",
        "order_times": ["lunch"],
        "pref_take_order_location": "hall_lobby",
        "pref_delivery_habit": "hand_to_hand",
        "is_deliverer": false
      }
      ```
      Notes:
      - `available_return_times` and `preferred_delivery_halls` are optional unless `is_deliverer` is true.
      - `profile_completed` is set server-side.

  - Create an open group order (root) in your hall:
    - `POST /orders` body (example; set `delivery_hall` to your hall):
      ```json
      {
        "canteen": "LG1",
        "items": [{"name": "Test Item", "qty": 1, "price": 10.0}],
        "total_price": 10.0,
        "delivery_hall": "Hall I",
        "note": "group root",
        "is_group_open": true
      }
      ```

  **Commit**: YES | Message: `feat(orders): enforce group order access by user hall` | Files: `backend/routers/orders.py`, `backend/services/order_service.py`

- [x] 7. Verification wave: type-check + backend curl script capture

  **What to do**:
  - Run TypeScript type-check:
    - `cd mobile && npx tsc --noEmit`
  - Run backend server and execute curl smoke checks for hall enforcement.
  - Save outputs to evidence files.

  **Backend curl checklist (decision-complete)**:
  - Create two users, set halls to different values, and create one open group order per hall.
  - Verify each user sees only their hall via `/orders/group/hall-open`.
  - Verify cross-hall detail and join return 403.

  **Recommended Agent Profile**:
  - Category: `quick`
  - Skills: none

  **Parallelization**: Can Parallel: YES | Wave 2

  **Acceptance Criteria**:
  - [ ] `npx tsc --noEmit` passes.
  - [ ] curl evidence shows list/detail/join hall restrictions behave as defined.

  **QA Scenarios**:
  ```
  Scenario: Mobile type-check passes
    Tool: Bash
    Steps:
      1) cd mobile
      2) npx tsc --noEmit
    Expected: Exit code 0.
    Evidence: .sisyphus/evidence/task-7-tsc.txt

  Scenario: Backend curl checks pass
    Tool: Bash
    Steps:
      1) cd backend && uvicorn main:app --reload
      2) Run curl calls described in Task 6
    Expected: Behavior matches acceptance criteria.
    Evidence: .sisyphus/evidence/task-7-backend-curl.txt
  ```

  **Commit**: NO

## Final Verification Wave (4 parallel agents, ALL must APPROVE)
- [ ] F1. Plan Compliance Audit — oracle
- [ ] F2. Code Quality Review — unspecified-high
- [ ] F3. RN UX Review (spacing/centering/pointer) — visual-engineering
- [ ] F4. Scope Fidelity Check — deep

## Commit Strategy
- Prefer 1 commit per logical area (Toast, UI spacing, Group Orders frontend, Group Orders backend) to keep diffs reviewable.
- Do not commit until user explicitly asks; otherwise leave changes uncommitted.

## Success Criteria
- Requested UI issues are resolved without regressions.
- Group Orders cannot be browsed/joined cross-hall via API bypass.
- Type-check passes; backend smoke checks pass.
  - Accept group delivery (`backend/routers/orders.py` → `PATCH /orders/group/{root_order_id}/accept`):
    - Before calling `accept_group_order`, load the root order.
    - Enforce the same hall rules as detail:
      - if `user.dorm_hall` missing → 403
      - if `root.delivery_hall != user.dorm_hall` → 403
    - Rationale: prevents bypass where a deliverer accepts cross-hall batch deliveries by calling the endpoint directly.
