# Phase 2: Deliverer Experience Bugfixes & Enhancements

## TL;DR

> **Quick Summary**: Fix 3 deliverer-facing issues — a 403 bug preventing order detail viewing, missing sort/filter on the queue, and a hardcoded active orders count on the dashboard.
> 
> **Deliverables**:
> - Backend permission fix: deliverers can view pending order details
> - Sort toggle on DelivererQueueScreen (By Preference / By Time)
> - New backend endpoint for deliverer's active orders
> - Dynamic active orders count on Dashboard
> 
> **Estimated Effort**: Short
> **Parallel Execution**: YES — 2 waves
> **Critical Path**: Task 3 (backend endpoint) → Task 4 (frontend wiring)

---

## Context

### Original Request
User reported 3 issues after testing with two phones (orderer + deliverer):
1. "I tried using another phone to act as the deliverer but I can't open the order to check the order details and accept it" (HTTP 403)
2. "I want to do a filter system for the deliverer to check the order page — options will be according preference (the closer preference on the top) or according to time (the earliest on the top), default according preference"
3. "The button for the deliverer to check active orders — it doesn't update the numbers of active order"

### Research Findings
- **Bug 1 root cause**: `backend/routers/orders.py` line 126 — permission check `order.orderer_id != str(user.id) and order.deliverer_id != str(user.id)` rejects deliverers browsing the queue because `deliverer_id` is `None` for pending orders.
- **Bug 2 current state**: `DelivererQueueScreen.tsx` has no sort UI. Backend `get_deliverer_queue()` sorts by `created_at.asc()` only. User's `preferred_delivery_halls` list can serve as priority ranking.
- **Bug 3 current state**: `DashboardScreen.tsx` line 183 has hardcoded `"No active orders"` text. No API endpoint exists to fetch a deliverer's active (accepted/picked_up) orders.

### Metis Review
**Identified Gaps** (addressed):
- Security: Pending order access should not expose sensitive QR data to non-orderers — `qr_code_image` and `qr_code_data` fields exist in `OrderResponse` (lines 59-60 of `backend/schemas/order.py`). For pending orders viewed by non-orderers, these fields must be nulled/redacted in the response to prevent data leakage.
- Edge case: Deliverer with empty `preferred_delivery_halls` — "By Preference" sort falls back to "By Time" behavior.
- Race condition: Deliverer views pending order details, someone else accepts it — the `accept_order` service already handles this with status check, and the 400 error is surfaced in OrderDetailScreen.
- Navigation: "Active Orders" card still navigates to DelivererQueue (pending orders), not a new screen — this matches user's intent.

---

## Work Objectives

### Core Objective
Fix 3 deliverer-facing issues to make the deliverer workflow functional and usable when tested with multiple devices.

### Concrete Deliverables
- `backend/routers/orders.py` — Updated permission check allowing pending order viewing
- `backend/services/order_service.py` — New `get_deliverer_orders()` function
- `backend/routers/orders.py` — New `GET /orders/my-deliveries` endpoint
- `mobile/src/screens/DelivererQueueScreen.tsx` — Sort toggle UI with preference/time modes
- `mobile/src/api/orders.ts` — New `getMyDeliveries()` API function
- `mobile/src/screens/DashboardScreen.tsx` — Dynamic active orders count display

### Definition of Done
- [ ] Deliverer can tap any pending order in queue and see full details (no 403)
- [ ] DelivererQueueScreen has a sort toggle defaulting to "By Preference"
- [ ] Dashboard deliverer card shows actual count of accepted/picked_up orders
- [ ] `npx tsc --noEmit` passes in `mobile/` directory

### Must Have
- Permission fix scoped to pending orders ONLY
- Sort toggle with two options: "By Preference" (default) and "By Time"
- Dynamic count from real API data on Dashboard

### Must NOT Have (Guardrails)
- Do NOT remove the permission check for non-pending orders — 403 must still apply for non-pending orders where user is not orderer/deliverer
- Do NOT add new npm or pip packages
- Do NOT modify database models or create migrations
- Do NOT create new navigation screens or routes
- Do NOT add inline styles — use `StyleSheet.create()`
- Do NOT use `any` type in TypeScript
- Do NOT add real-time/WebSocket updates — use `useFocusEffect` refresh
- Do NOT build a separate "My Deliveries" screen — the card still navigates to DelivererQueue
- Do NOT add a search bar or multi-criteria filter — only a two-option sort toggle
- Do NOT persist sort preference across navigations — local `useState` only
- Do NOT expose `qr_code_image` or `qr_code_data` to non-orderer users viewing pending orders — these fields must be nulled in the response

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: NO (no pytest, jest)
- **Automated tests**: None
- **Framework**: None
- **Verification**: `npx tsc --noEmit` for frontend, `curl` for backend endpoints

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Backend**: Use Bash (curl) — Send requests, assert status + response fields
- **Frontend**: Use `npx tsc --noEmit` for type safety, visual verification via description

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — no dependencies):
├── Task 1: Fix 403 permission on pending order details [quick]
├── Task 2: Add sort toggle to DelivererQueueScreen [visual-engineering]
└── Task 3: Add backend endpoint for deliverer's active orders [quick]

Wave 2 (After Task 3 completes):
└── Task 4: Wire Dashboard to display active orders count [quick]

Wave FINAL (After ALL tasks):
├── F1: Plan compliance audit [oracle]
├── F2: Code quality review [unspecified-high]
├── F3: Real QA [unspecified-high]
└── F4: Scope fidelity check [deep]

Critical Path: Task 3 → Task 4
Parallel Speedup: ~50% faster than sequential
Max Concurrent: 3 (Wave 1)
```

### Dependency Matrix

| Task | Depends On | Blocks | Wave |
|------|-----------|--------|------|
| 1 | None | None | 1 |
| 2 | None | None | 1 |
| 3 | None | 4 | 1 |
| 4 | 3 | None | 2 |

### Agent Dispatch Summary

- **Wave 1**: 3 tasks — T1 → `quick`, T2 → `visual-engineering` + `frontend-ui-ux`, T3 → `quick`
- **Wave 2**: 1 task — T4 → `quick`
- **FINAL**: 4 tasks — F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high`, F4 → `deep`

---

## TODOs


- [ ] 1. Fix 403 Permission on Pending Order Details

  **What to do**:
  - In `backend/routers/orders.py`, modify the `get_order_detail` endpoint (line 126)
  - Change the permission check from:
    ```python
    if order.orderer_id != str(user.id) and order.deliverer_id != str(user.id):
    ```
  - To:
    ```python
    is_orderer = order.orderer_id == str(user.id)
    is_deliverer = order.deliverer_id is not None and order.deliverer_id == str(user.id)
    if not is_orderer and not is_deliverer and order.status != "pending":
    ```
  - This allows ANY authenticated user to view pending orders (so deliverers can browse details before accepting)
  - Non-pending orders still require the user to be the orderer or assigned deliverer
  - **SECURITY**: After the permission check, if the user is NOT the orderer and the order is pending, null out QR fields before returning:
    ```python
    response = await _get_order_response(db, order)
    if not is_orderer:
        response.qr_code_image = None
        response.qr_code_data = None
    return response
    ```
  - Replace the current `return await _get_order_response(db, order)` with the above block
  - Import `status` from `fastapi` if not already imported (it already is — verify at top of file)

  **Must NOT do**:
  - Do NOT remove the permission check entirely — it must remain for non-pending orders
  - Do NOT modify the `OrderResponse` schema definition in `schemas/order.py` — the redaction is done at the router level, not the schema level
  - Do NOT expose `qr_code_image` or `qr_code_data` to non-orderer users — null these fields in the response for non-orderer viewers
  - Do NOT touch any other endpoint in orders.py
  - Do NOT add new imports or dependencies

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single-line condition change in one file, no complex logic
  - **Skills**: []
    - No specialized skills needed for a backend permission fix
  - **Skills Evaluated but Omitted**:
    - `playwright`: No browser interaction needed
    - `frontend-ui-ux`: No frontend work

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3)
  - **Blocks**: None
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - `backend/routers/orders.py:112-131` — The `get_order_detail` endpoint with the faulty permission check at line 126
  - `backend/routers/orders.py:134-163` — The `accept_delivery` endpoint for reference on how order status checks work

  **API/Type References**:
  - `backend/models/order.py` — Order model with `status`, `orderer_id`, `deliverer_id` fields
  - `backend/schemas/order.py:OrderResponse` — Response schema with `qr_code_image` and `qr_code_data` fields at lines 59-60 (do NOT modify the schema definition — redaction happens at router level)

  **Why Each Reference Matters**:
  - `orders.py:126` — This is the exact line to modify. The condition `order.orderer_id != str(user.id) and order.deliverer_id != str(user.id)` fails for pending orders where `deliverer_id` is `None`
  - `orders.py:134-163` — Shows the pattern for status-based checks (e.g., `if order.status != "pending"`) that the fix should follow

  **Acceptance Criteria**:
  - [ ] Permission check updated in `backend/routers/orders.py`
  - [ ] QR fields (`qr_code_image`, `qr_code_data`) are nulled for non-orderer viewers of pending orders
  - [ ] Backend starts without error: `uvicorn main:app --reload`

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Deliverer can view pending order details (happy path)
    Tool: Bash (curl)
    Preconditions: Backend running on localhost:8000, two users registered (orderer + deliverer), orderer has created a pending order
    Steps:
      1. Get deliverer's JWT token via POST /auth/login with deliverer credentials
      2. curl -s -w "\n%{http_code}" -H "Authorization: Bearer <deliverer_token>" http://localhost:8000/orders/<pending_order_id>
      3. Parse response body as JSON
    Expected Result: HTTP 200 with order JSON including id, status="pending", items array, delivery_hall. **qr_code_image and qr_code_data MUST be null** (redacted for non-orderer)
    Failure Indicators: HTTP 403 with "You can only view your own orders" message
    Evidence: .sisyphus/evidence/task-1-deliverer-view-pending.txt

  Scenario: Non-involved user cannot view non-pending order (security check)
    Tool: Bash (curl)
    Preconditions: An order exists with status "accepted" or "delivered" where the test user is neither orderer nor deliverer
    Steps:
      1. curl -s -w "\n%{http_code}" -H "Authorization: Bearer <uninvolved_user_token>" http://localhost:8000/orders/<non_pending_order_id>
      2. Check HTTP status code
    Expected Result: HTTP 403 with error detail "You can only view your own orders"
    Failure Indicators: HTTP 200 (would mean permission check is broken for non-pending orders)
    Evidence: .sisyphus/evidence/task-1-nonpending-403.txt

  Scenario: QR fields are redacted for non-orderer viewing pending order (security)
    Tool: Bash (curl)
    Preconditions: Backend running, orderer has created a pending order with qr_code_image data
    Steps:
      1. Get deliverer's JWT token via POST /auth/login
      2. curl -s -H "Authorization: Bearer <deliverer_token>" http://localhost:8000/orders/<pending_order_id>
      3. Parse JSON response and check qr_code_image and qr_code_data fields
    Expected Result: Both qr_code_image and qr_code_data are null in the response
    Failure Indicators: qr_code_image or qr_code_data contain non-null values
    Evidence: .sisyphus/evidence/task-1-qr-redaction.txt
  ```

  **Commit**: YES
  - Message: `fix(backend): allow deliverers to view pending order details`
  - Files: `backend/routers/orders.py`

- [ ] 2. Add Sort Toggle to DelivererQueueScreen

  **What to do**:
  - In `mobile/src/screens/DelivererQueueScreen.tsx`, add a two-option sort toggle below the header
  - Add state: `const [sortMode, setSortMode] = useState<'preference' | 'time'>('preference')`
  - Create a segmented control UI matching the orderer/deliverer toggle pattern in `DashboardScreen.tsx` lines 110-146
  - The toggle has two options: "By Preference" (default) and "By Time"
  - **"By Time" sorting**: Keep existing backend order (`created_at` ascending — earliest first)
  - **"By Preference" sorting**: Sort frontend-side using `useMemo`:
    - Get user's `preferred_delivery_halls` array from `useAuth()` context
    - Orders whose `delivery_hall` appears earlier in the preference list rank higher (lower index = higher priority)
    - Orders for halls NOT in the preference list go to the end
    - Within same priority tier, sort by `created_at` ascending
    - If `preferred_delivery_halls` is `null` or empty, behave same as "By Time"
  - Pass the sorted data to FlatList instead of raw `orders`
  - Add styles for the toggle to `StyleSheet.create()` at bottom of file
  - Follow dark mode color pattern already in the file

  **Must NOT do**:
  - Do NOT add a search bar, text input, or multi-criteria filter — only a two-option toggle
  - Do NOT add new npm packages
  - Do NOT use inline styles — add to `StyleSheet.create()`
  - Do NOT persist sort preference (local `useState` only)
  - Do NOT modify the backend or API layer
  - Do NOT use `any` type
  - Do NOT modify OrderCard component

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: UI component work with dark mode styling and visual toggle
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Needed for creating visually consistent toggle matching existing design
  - **Skills Evaluated but Omitted**:
    - `playwright`: Not needed — no browser-based verification for React Native

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3)
  - **Blocks**: None
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - `mobile/src/screens/DashboardScreen.tsx:110-146` — The orderer/deliverer toggle UI. Copy this pattern for the sort toggle (two `TouchableOpacity` buttons inside a container, with active state styling)
  - `mobile/src/screens/DelivererQueueScreen.tsx:1-132` — The full current file. Sort toggle goes between the header `</View>` (line 62) and the empty state/FlatList conditional (line 64)
  - `mobile/src/screens/DelivererQueueScreen.tsx:54-62` — Header section. The sort toggle should be inserted after this

  **API/Type References**:
  - `mobile/src/types/index.ts:Order` — Order type with `delivery_hall: string` and `created_at: string` fields
  - `mobile/src/context/AuthContext.tsx` — `useAuth()` returns `user` with `preferred_delivery_halls: string[]` field

  **External References**:
  - None — all patterns exist in codebase

  **Why Each Reference Matters**:
  - `DashboardScreen.tsx:110-146` — Provides the exact toggle UI pattern to replicate (container + two touchable buttons + active state)
  - `DelivererQueueScreen.tsx:54-62` — Shows exactly where to insert the new toggle in the existing layout
  - `types/index.ts:Order` — Confirms the `delivery_hall` field name for sorting logic
  - `AuthContext.tsx` — Confirms `user.preferred_delivery_halls` is available from context

  **Acceptance Criteria**:
  - [ ] Sort toggle renders below header with two options
  - [ ] Default sort is "By Preference"
  - [ ] Switching toggles re-sorts the list without API call
  - [ ] `npx tsc --noEmit` passes in `mobile/` directory

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Sort toggle renders and defaults to "By Preference" (happy path)
    Tool: Bash (npx tsc)
    Preconditions: All TypeScript changes applied
    Steps:
      1. Run `npx tsc --noEmit` in `mobile/` directory
      2. Verify exit code is 0
      3. Read `mobile/src/screens/DelivererQueueScreen.tsx` and verify:
         - useState for sortMode exists with default 'preference'
         - Toggle UI renders with "By Preference" and "By Time" options
         - useMemo sorts orders based on sortMode
         - FlatList data uses sorted array
    Expected Result: TypeScript compiles cleanly. Sort toggle code is present with correct default.
    Failure Indicators: tsc errors, missing useState/useMemo, wrong default value
    Evidence: .sisyphus/evidence/task-2-tsc-check.txt

  Scenario: Preference sort logic handles null preferred_delivery_halls (edge case)
    Tool: Bash (code review)
    Preconditions: Sort logic implemented
    Steps:
      1. Read the useMemo sort function in DelivererQueueScreen.tsx
      2. Verify there is a null/empty check for user?.preferred_delivery_halls
      3. Verify it falls back to created_at sort when preferences are null/empty
    Expected Result: Null-safe sorting — when preferred_delivery_halls is null or [], sort behaves like "By Time"
    Failure Indicators: No null check, potential runtime crash on null.indexOf()
    Evidence: .sisyphus/evidence/task-2-nullsafe-check.txt
  ```

  **Commit**: YES (groups with standalone)
  - Message: `feat(mobile): add sort toggle to deliverer queue screen`
  - Files: `mobile/src/screens/DelivererQueueScreen.tsx`


- [ ] 3. Add Backend Endpoint for Deliverer's Active Orders

  **What to do**:
  - In `backend/services/order_service.py`, add a new function `get_deliverer_orders()`:
    ```python
    async def get_deliverer_orders(db: AsyncSession, user_id: str) -> list[Order]:
        """Get orders where user is the deliverer with active status."""
        result = await db.execute(
            select(Order)
            .where(Order.deliverer_id == user_id)
            .where(Order.status.in_(["accepted", "picked_up"]))
            .order_by(Order.created_at.asc())
        )
        return list(result.scalars().all())
    ```
  - In `backend/routers/orders.py`, add a new endpoint BEFORE the `/{order_id}` route (important — FastAPI matches routes top-down, `/my-deliveries` must come before `/{order_id}` to avoid being captured as an order_id):
    ```python
    @router.get("/my-deliveries", response_model=list[OrderResponse])
    async def get_my_deliveries(
        user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
    ):
        """Get orders where current user is the deliverer (accepted/picked_up)."""
        orders = await get_deliverer_orders(db, str(user.id))
        return [await _get_order_response(db, o) for o in orders]
    ```
  - Import `get_deliverer_orders` from `services.order_service` in the router file

  **Must NOT do**:
  - Do NOT place the route AFTER `/{order_id}` — it will be captured as an order_id string
  - Do NOT modify existing endpoints
  - Do NOT modify database models
  - Do NOT add query parameters to existing endpoints
  - Do NOT include cancelled/delivered orders — only `accepted` and `picked_up`

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Small service function + one new endpoint, follows existing patterns exactly
  - **Skills**: []
    - No specialized skills needed
  - **Skills Evaluated but Omitted**:
    - `playwright`: No browser interaction
    - `frontend-ui-ux`: No frontend work

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2)
  - **Blocks**: Task 4 (frontend wiring depends on this endpoint existing)
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - `backend/services/order_service.py:64-81` — `get_user_orders()` and `get_deliverer_queue()` functions. Follow the exact same pattern: async function, typed params, docstring, select query with filters
  - `backend/routers/orders.py:95-109` — `get_my_orders()` endpoint. Follow this pattern for the new `/my-deliveries` endpoint (response_model, Depends, calling service function)

  **API/Type References**:
  - `backend/models/order.py` — Order model with `deliverer_id`, `status` fields
  - `backend/schemas/order.py:OrderResponse` — Response schema to use as response_model
  - `backend/routers/orders.py:20-40` — `_get_order_response()` helper function for building OrderResponse

  **Why Each Reference Matters**:
  - `order_service.py:64-81` — Shows the exact function structure to replicate (async, select, where, order_by, list comprehension)
  - `orders.py:95-109` — Shows how `get_my_orders` is wired, the new endpoint mirrors this pattern but for deliverer role
  - `orders.py:20-40` — The `_get_order_response()` helper is needed to build the response with joined data (orderer/deliverer profiles)

  **Acceptance Criteria**:
  - [ ] New function `get_deliverer_orders()` exists in `order_service.py`
  - [ ] New endpoint `GET /orders/my-deliveries` exists in `orders.py`
  - [ ] Endpoint is placed BEFORE `/{order_id}` route
  - [ ] Backend starts without error

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Deliverer gets their active orders (happy path)
    Tool: Bash (curl)
    Preconditions: Backend running, deliverer has accepted at least one order
    Steps:
      1. Get deliverer JWT token via POST /auth/login
      2. curl -s -w "\n%{http_code}" -H "Authorization: Bearer <token>" http://localhost:8000/orders/my-deliveries
      3. Parse response as JSON array
    Expected Result: HTTP 200 with JSON array of orders where status is "accepted" or "picked_up"
    Failure Indicators: HTTP 404 (route not found — likely placed after /{order_id}), HTTP 422, empty array when orders exist
    Evidence: .sisyphus/evidence/task-3-active-deliveries.txt

  Scenario: Deliverer with no active orders gets empty array (edge case)
    Tool: Bash (curl)
    Preconditions: Backend running, user has no accepted/picked_up orders as deliverer
    Steps:
      1. curl -s -w "\n%{http_code}" -H "Authorization: Bearer <token>" http://localhost:8000/orders/my-deliveries
    Expected Result: HTTP 200 with empty JSON array `[]`
    Failure Indicators: HTTP 500, non-array response
    Evidence: .sisyphus/evidence/task-3-empty-deliveries.txt
  ```

  **Commit**: YES (groups with Task 4)
  - Message: `feat: add deliverer active orders endpoint and dashboard count`
  - Files: `backend/services/order_service.py`, `backend/routers/orders.py`

- [ ] 4. Wire Dashboard to Display Deliverer's Active Orders Count

  **What to do**:
  - In `mobile/src/api/orders.ts`, add a new API function:
    ```typescript
    export async function getMyDeliveries(): Promise<Order[]> {
      const response = await client.get('/orders/my-deliveries');
      return response.data;
    }
    ```
  - Import `Order` type if not already imported in the API file
  - In `mobile/src/screens/DashboardScreen.tsx`:
    - Import `getMyDeliveries` from `'../api/orders'`
    - Add state: `const [activeDeliveryCount, setActiveDeliveryCount] = useState(0);`
    - In the existing `useFocusEffect` callback (lines 43-49), add a conditional fetch when `isDelivererMode` is true:
      ```typescript
      if (isDelivererMode) {
        getMyDeliveries()
          .then(orders => setActiveDeliveryCount(orders.length))
          .catch(err => console.error('Failed to fetch active deliveries:', err));
      }
      ```
    - The `useFocusEffect` dependencies should include `isDelivererMode`
    - Replace the hardcoded text at line 183 (`No active orders`) with dynamic text:
      ```typescript
      {activeDeliveryCount === 0
        ? 'No active orders'
        : `${activeDeliveryCount} active order${activeDeliveryCount !== 1 ? 's' : ''}`}
      ```
  - Keep the card's `onPress` navigation target as `'DelivererQueue'` — do NOT change this

  **Must NOT do**:
  - Do NOT change the navigation target of the Active Orders card
  - Do NOT create a new screen for "My Deliveries"
  - Do NOT add WebSocket/real-time updates — `useFocusEffect` refresh is sufficient
  - Do NOT use `any` type
  - Do NOT add inline styles
  - Do NOT modify the orderer view section of Dashboard

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Small API function + state management + text replacement, follows existing patterns
  - **Skills**: []
    - No specialized skills needed
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: No new UI components, just wiring data
    - `playwright`: Not applicable for React Native

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (sequential after Wave 1)
  - **Blocks**: None
  - **Blocked By**: Task 3 (needs the `/orders/my-deliveries` endpoint to exist)

  **References**:

  **Pattern References**:
  - `mobile/src/api/orders.ts` — All existing API functions (e.g., `getMyOrders()`, `getDelivererQueue()`). Follow the same pattern: export async function, typed return Promise<T>, `client.get()` call
  - `mobile/src/screens/DashboardScreen.tsx:43-49` — Existing `useFocusEffect` that fetches leaderboard. Add the deliverer count fetch alongside this
  - `mobile/src/screens/DashboardScreen.tsx:176-186` — The deliverer view section with the hardcoded "No active orders" text at line 183

  **API/Type References**:
  - `mobile/src/types/index.ts:Order` — Order type returned by the API
  - `mobile/src/api/client.ts` — Axios client instance with Bearer token interceptor

  **Why Each Reference Matters**:
  - `api/orders.ts` — Shows the exact pattern for API functions that the new `getMyDeliveries()` must follow
  - `DashboardScreen.tsx:43-49` — Shows where to add the fetch call (inside existing `useFocusEffect`)
  - `DashboardScreen.tsx:176-186` — Shows the exact JSX to modify (line 183 is the hardcoded text)

  **Acceptance Criteria**:
  - [ ] `getMyDeliveries()` function exists in `mobile/src/api/orders.ts`
  - [ ] Dashboard fetches active delivery count on focus when in deliverer mode
  - [ ] Hardcoded "No active orders" replaced with dynamic text
  - [ ] Shows "No active orders" when count is 0, "N active order(s)" when count > 0
  - [ ] `npx tsc --noEmit` passes in `mobile/` directory

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Dashboard shows dynamic delivery count (happy path)
    Tool: Bash (npx tsc + code review)
    Preconditions: Tasks 1-3 implemented, TypeScript changes applied
    Steps:
      1. Run `npx tsc --noEmit` in `mobile/` directory
      2. Verify exit code is 0
      3. Read `mobile/src/screens/DashboardScreen.tsx` and verify:
         - getMyDeliveries is imported from '../api/orders'
         - activeDeliveryCount state exists with default 0
         - useFocusEffect fetches count when isDelivererMode is true
         - Line 183 area uses conditional text based on activeDeliveryCount
    Expected Result: TypeScript compiles. Dynamic text logic present. Fetch in useFocusEffect.
    Failure Indicators: tsc errors, hardcoded text still present, missing import
    Evidence: .sisyphus/evidence/task-4-tsc-check.txt

  Scenario: Zero active orders shows correct text (edge case)
    Tool: Bash (code review)
    Preconditions: Dynamic text implemented
    Steps:
      1. Read the conditional text expression in DashboardScreen.tsx
      2. Verify when activeDeliveryCount === 0, text shows "No active orders"
      3. Verify when count is 1, text shows "1 active order" (singular)
      4. Verify when count is 2+, text shows "N active orders" (plural)
    Expected Result: Correct singular/plural handling and zero-state text
    Failure Indicators: Wrong text for 0 count, missing singular/plural logic
    Evidence: .sisyphus/evidence/task-4-text-logic.txt
  ```

  **Commit**: YES (groups with Task 3)
  - Message: `feat: add deliverer active orders endpoint and dashboard count`
  - Files: `mobile/src/api/orders.ts`, `mobile/src/screens/DashboardScreen.tsx`

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Rejection → fix → re-run.

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, curl endpoint, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in `.sisyphus/evidence/`. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run `npx tsc --noEmit` in `mobile/`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names (data/result/item/temp). Verify all styles use `StyleSheet.create()`. No inline style objects.
  Output: `TypeCheck [PASS/FAIL] | Files [N clean/N issues] | VERDICT`

- [ ] F3. **Real QA** — `unspecified-high`
  Start backend with `uvicorn main:app --reload`. Execute EVERY QA scenario from EVERY task — follow exact steps, capture evidence. Test cross-task integration: create a pending order as orderer, switch to deliverer, view the order (Task 1), check queue sort (Task 2), check dashboard count (Tasks 3+4). Save to `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff (`git diff`). Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep). Check "Must NOT do" compliance. Detect cross-task contamination. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

- **Commit 1** (after Wave 1): `fix(backend): allow deliverers to view pending order details` — `backend/routers/orders.py`
- **Commit 2** (after Wave 1): `feat(mobile): add sort toggle to deliverer queue screen` — `mobile/src/screens/DelivererQueueScreen.tsx`
- **Commit 3** (after Wave 1+2): `feat: add deliverer active orders endpoint and dashboard count` — `backend/routers/orders.py`, `backend/services/order_service.py`, `mobile/src/api/orders.ts`, `mobile/src/screens/DashboardScreen.tsx`

---

## Success Criteria

### Verification Commands
```bash
npx tsc --noEmit                 # Expected: exit 0, no errors (run in mobile/)
curl -H "Authorization: Bearer <deliverer_token>" http://localhost:8000/orders/<pending_order_id>  # Expected: HTTP 200
curl -H "Authorization: Bearer <deliverer_token>" http://localhost:8000/orders/my-deliveries       # Expected: HTTP 200, JSON array
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] `npx tsc --noEmit` passes
- [ ] Deliverer can view pending order details
- [ ] Sort toggle works on DelivererQueueScreen
- [ ] Dashboard shows dynamic active orders count
