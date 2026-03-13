# Group Orders: Deliverer Approval Workflow + Lucky Draw Wheel UI Polish

## TL;DR
> **Summary**: Remove deliverer-facing “Group Orders” entry points, and change Group Orders joining to an approval-based workflow where joins are only possible **after a deliverer accepts** and must be **approved by the deliverer**; after pickup, joins are blocked. Also redesign the Lucky Draw wheel screen to match the app’s card-based UI.
> **Deliverables**:
> - Deliverer Dashboard: no Group Orders card
> - Deliverer Queue: remove “Group Orders Only” toggle
> - Backend: join requests + approve/reject/cancel endpoints; keep group open after accept; hard-block joins after pickup
> - Mobile: requester can submit join request (with note) and see status; deliverer can approve/reject in GroupOrderDetail (accessed from OrderDetail)
> - Lucky Draw wheel: card hierarchy + wheel ring + center hub + improved spacing
> **Effort**: Large
> **Parallel**: YES — 3 waves
> **Critical Path**: Data model (new table) → backend join-request endpoints → mobile UI wiring → verification

## Context
### Original Request (this turn)
- Deliverer page should not have group order section.
- After deliverer accepts, joiners must be approved by deliverer before joining.
- After deliverer marks picked up, no more joining.
- Deliverer cannot approve their own join request.
- Wheel appearance still not improved.

### Decisions Locked (user-confirmed)
- Join requires approval: **ALWAYS**.
- Before deliverer accepts (root status `pending`): **auto-reject until accepted** (i.e., no join requests allowed until accepted).
- Deliverer approval UI: **GroupOrderDetail screen**, reachable for deliverer via **OrderDetail**.
- Lucky Draw: **card + polished wheel**.
- Re-request after rejection: **blocked until status changes**.

### Repo Facts (grounded)
- Backend group orders are linked orders via `orders.group_order_id` and `orders.is_group_open`:
  - `backend/models/order.py` — `group_order_id`, `is_group_open`
  - `backend/services/order_service.py` — `join_group_order`, `accept_group_order`, `pickup_group_order`, `deliver_group_order`
  - `backend/routers/orders.py` — `/orders/group/*` endpoints
- Mobile entry points today:
  - `mobile/src/screens/DashboardScreen.tsx` — deliverer view includes “Group Orders” card
  - `mobile/src/screens/DelivererQueueScreen.tsx` — has “Group Orders Only” toggle
  - `mobile/src/screens/GroupOrdersHallBoardScreen.tsx` → `GroupOrderDetailScreen.tsx`
  - `mobile/src/screens/GroupOrderJoinScreen.tsx` — currently does immediate join via `/orders/group/{id}/join`
- No Alembic migrations; schema changes require DB reset (`docker compose down -v`).

## Work Objectives
### Core Objective
Implement deliverer-approved join requests for group orders (post-accept only) and remove deliverer “Group Orders” UI surfaces, while polishing Lucky Draw wheel UI.

### Definition of Done (verifiable)
- Frontend: `cd mobile && npx tsc --noEmit` succeeds.
- Backend: new join-request endpoints behave correctly via curl:
  - Create join request returns 409/400 when root not `accepted` or after `picked_up`
  - Deliverer can list pending requests and approve/reject
  - Approve creates child order + deducts 1 credit from requester
  - Pickup blocks further requests and rejects existing pending requests
- UI: Deliverer Dashboard contains no Group Orders card; Deliverer Queue contains no Group Orders Only toggle.
- Lucky Draw: screen uses card hierarchy consistent with `OrderCard`/Dashboard styling (no hard-coded colors except white label fill).

### Must Have
- No new dependencies.
- Deliverer cannot approve their own request (and cannot create one for a group they deliver).
- Join requests are only possible after accept and before pickup.
- Re-request after rejection is blocked while root remains in same status.

### Must NOT Have (guardrails)
- Do NOT rework overall navigation structure (only add a small entry button from OrderDetail).
- Do NOT add test frameworks/linters.
- Do NOT change the lucky draw selection algorithm.
- Do NOT add Alembic.

## Verification Strategy
> ZERO HUMAN INTERVENTION target; backend has no automated tests.
- Frontend: `npx tsc --noEmit`
- Backend: run uvicorn + curl scripts; save outputs under `.sisyphus/evidence/`
- DB schema change: document required `docker compose down -v` step and run it in verification if executor has existing data.

## Execution Strategy
### Parallel Execution Waves
Wave 1 (foundation)
- New backend model + schemas for join requests
- Backend service functions + router endpoints for join requests
- Change group accept/pickup semantics (keep open after accept; close on pickup)

Wave 2 (mobile wiring)
- Remove deliverer “Group Orders” card from Dashboard deliverer view
- Remove deliverer queue “Group Orders Only” toggle + filtering
- Update GroupOrderJoin + GroupOrderDetail screens to use join requests + statuses
- Add deliverer entry button in OrderDetail to open GroupOrderDetail

Wave 3 (UI polish + verification)
- Lucky Draw screen redesign
- Type-check + backend curl verification

### Dependency Matrix (full)
- Wave 2 depends on Wave 1 API contracts
- Wheel UI can run in parallel with backend work

## TODOs
> Every task includes implementation + verification.

### Wave 1 — Backend: Join Requests + Lifecycle

- [x] 1. Add `GroupOrderJoinRequest` ORM model + ensure table is created

  **What to do**:
  - Create `backend/models/group_order_join_request.py` with SQLAlchemy async model:
    - `id: String PK default uuid`
    - `root_order_id: String FK orders.id` (name it exactly `root_order_id`)
    - `requester_id: String FK users.id`
    - `status: String` enum-like values: `pending|approved|rejected|cancelled`
    - `note: String | None`
    - `created_at: DateTime tz`
    - `decided_at: DateTime tz | None`
    - `decided_by_user_id: String | None` (FK users.id nullable)
    - `child_order_id: String | None` (FK orders.id nullable)
    - `decision_reason: String | None` (short reason, e.g., `picked_up`, `rejected_by_deliverer`, `insufficient_credits`)
  - Add uniqueness constraint to prevent spam:
    - Unique `(root_order_id, requester_id, status in pending)` isn't expressible directly; implement as:
      - DB-level: unique `(root_order_id, requester_id)`.
      - App-level: allow a new request only if existing is `cancelled`; block if `rejected` while root status unchanged; block if `pending`.
  - Ensure model is imported at startup so table exists:
    - In `backend/main.py`, add `from models.group_order_join_request import GroupOrderJoinRequest` (top-level import alongside `ChatMessage`).

  **Must NOT do**:
  - Don't add Alembic.

  **References**:
  - Base model style: `backend/models/order.py`
  - Table registration: `backend/main.py` imports `ChatMessage`

  **Acceptance Criteria**:
  - [ ] New model file exists and is imported by `backend/main.py`.
  - [ ] Document schema-change requirement in evidence: `docker compose down -v` required to apply new table if DB already initialized.

  **QA Scenarios**:
  ```
  Scenario: Table is created on startup
    Tool: Bash
    Steps:
      1) cd backend
      2) Start server: uvicorn main:app --reload
      3) Confirm no import errors and startup completes
    Expected: Startup succeeds; metadata includes new table.
    Evidence: .sisyphus/evidence/task-1-backend-startup.txt
  ```

  **Commit**: YES | Message: `feat(group-orders): add join request model` | Files: `backend/models/group_order_join_request.py`, `backend/main.py`

- [x] 2. Add Pydantic schemas for join request API contracts

  **What to do**:
  - Update `backend/schemas/order.py`:
    - Add response schema `GroupOrderJoinRequestResponse` with:
      - id, root_order_id, requester_id, requester_nickname, status, note, created_at, decided_at, decided_by_user_id, decision_reason
    - Add create schema `GroupOrderJoinRequestCreate` with `note: str|None`
    - Add decision schema `GroupOrderJoinRequestDecision` with optional `reason: str|None` (deliverer can supply)
    - Update `GroupOrderResponse` to include optional requester state:
      - `my_join_request: GroupOrderJoinRequestResponse | None = None`
      - `pending_join_requests_count: int = 0`
      - (Keep existing fields unchanged.)

  **References**:
  - Existing schemas: `backend/schemas/order.py`
  - Nickname source: `backend/models/user.py` via DB select in routers

  **Acceptance Criteria**:
  - [ ] Schemas compile and are used by routers.

  **QA Scenarios**:
  ```
  Scenario: Import schemas without runtime errors
    Tool: Bash
    Steps:
      1) cd backend
      2) python -m py_compile schemas/order.py
    Expected: Exit code 0.
    Evidence: .sisyphus/evidence/task-2-py-compile.txt
  ```

  **Commit**: YES | Message: `feat(group-orders): define join request schemas` | Files: `backend/schemas/order.py`

- [ ] 3. Backend services: implement join-request workflow + enforcement

  **What to do**:
  - In `backend/services/order_service.py`, add functions:
    1) `create_group_join_request(db, root_order_id, requester: User, note)`
       - Load root order.
       - Enforce:
         - root exists
         - root is a root order: `group_order_id is None`
         - requester has `dorm_hall` and matches `root.delivery_hall` (keep current hall restriction)
         - requester != root.orderer_id
         - root.status == `accepted`
         - root.is_group_open == True
         - root.deliverer_id is not None
         - requester != root.deliverer_id  (deliverer cannot request)
         - root.status not in `picked_up|delivered|cancelled`
       - Block re-requests:
         - If existing request for (root, requester) exists:
           - if status == `pending` → 409
           - if status == `rejected` and root.status still `accepted` → 409
           - if status == `cancelled` → allow new (set back to pending by updating existing row instead of inserting, to satisfy unique constraint)
           - if status == `approved` → 409
       - Create/update request with status `pending`.

    2) `list_group_join_requests(db, root_order_id, deliverer: User, status_filter='pending')`
       - Ensure deliverer is `root.deliverer_id`.
       - Return list ordered by created_at asc.

    3) `approve_group_join_request(db, join_request_id, deliverer: User)`
       - Load join request + root order + requester.
       - Enforce:
         - join request status == pending
         - root.status == accepted
         - root.is_group_open == True
         - deliverer.id == root.deliverer_id
         - deliverer.id != requester.id
       - Create child order (participant) with:
         - `orderer_id=requester.id`
         - `canteen=root.canteen`, `delivery_hall=root.delivery_hall`, `delivery_preference=requester.pref_delivery_habit or 'hand_to_hand'`
         - `group_order_id=root.id`
         - `status='accepted'`, `deliverer_id=root.deliverer_id`, `accepted_at=now`
         - `note=join_request.note`
       - Deduct 1 credit from requester (same reason as join today or new reason `group_order_join_approved`).
         - If requester credits < 1 → raise 402 and keep request pending.
       - Update join request: status=approved, decided_at, decided_by_user_id, child_order_id.

    4) `reject_group_join_request(db, join_request_id, deliverer: User, reason: str | None)`
       - Enforce deliverer is assigned deliverer and request is pending.
       - Set status=rejected with reason.

    5) `cancel_group_join_request(db, join_request_id, requester: User)`
       - Only requester can cancel pending requests.
       - status=cancelled.

  - Update existing group lifecycle:
    - In `accept_group_order`: **REMOVE** `root_order.is_group_open = False` so group stays open after accept.
    - In `pickup_group_order`:
      - Set `root_order.is_group_open = False`.
      - Bulk-reject all pending join requests for that root with `decision_reason='picked_up'`.
    - In `close_group_order`:
      - Bulk-reject pending join requests with `decision_reason='closed'`.

  **Must NOT do**:
  - Do not commit DB inside services (follow existing pattern).

  **References**:
  - Existing join logic: `backend/services/order_service.py:join_group_order`
  - Existing accept/pickup flows: `accept_group_order`, `pickup_group_order`

  **Acceptance Criteria**:
  - [ ] After accept, `is_group_open` remains True until pickup.
  - [ ] Join request creation is blocked unless root.status == accepted.
  - [ ] Approval creates child order in accepted state and deducts 1 credit.
  - [ ] Pickup closes group and rejects pending requests.

  **QA Scenarios**:
  ```
  Scenario: Request blocked before accept
    Tool: Bash
    Steps:
      1) Create group root (pending)
      2) POST join-request
    Expected: 409/400 with message “Only allowed after deliverer accepts”
    Evidence: .sisyphus/evidence/task-3-request-blocked-before-accept.txt

  Scenario: Request approved after accept
    Tool: Bash
    Steps:
      1) Deliverer accepts root
      2) Requester creates join-request
      3) Deliverer approves
    Expected: join request becomes approved, child order appears in participants, requester credits -1.
    Evidence: .sisyphus/evidence/task-3-approve-flow.txt
  ```

  **Commit**: YES | Message: `feat(group-orders): implement deliverer-approved join requests` | Files: `backend/services/order_service.py`

- [ ] 4. Backend routers: expose join-request endpoints + extend group detail response

  **What to do**:
  - Update `backend/routers/orders.py`:
    - Add endpoint: `POST /orders/group/{root_order_id}/join-requests` (requester)
    - Add endpoint: `GET /orders/group/{root_order_id}/join-requests` (deliverer only)
    - Add endpoint: `PATCH /orders/group/join-requests/{join_request_id}/approve` (deliverer only)
    - Add endpoint: `PATCH /orders/group/join-requests/{join_request_id}/reject` (deliverer only)
    - Add endpoint: `PATCH /orders/group/join-requests/{join_request_id}/cancel` (requester only)
  - Extend `GET /orders/group/{root_order_id}` response building:
    - Populate `my_join_request` for current user (if any).
    - Populate `pending_join_requests_count` when current user is deliverer for the root.
  - Keep existing `/orders/group/{id}/join` endpoint but mark unused in mobile plan:
    - Option A (recommended): leave as-is for backward compatibility but remove UI entry points.

  **References**:
  - Existing router patterns: `backend/routers/orders.py`
  - Group detail: `get_group_order_detail`

  **Acceptance Criteria**:
  - [ ] New endpoints return 403 for unauthorized users.
  - [ ] Group detail includes `my_join_request` and `pending_join_requests_count`.

  **QA Scenarios**:
  ```
  Scenario: Deliverer can list pending requests
    Tool: Bash
    Steps:
      1) Accept root as deliverer
      2) Create join request as requester
      3) GET join-requests as deliverer
    Expected: 200 with the pending request included.
    Evidence: .sisyphus/evidence/task-4-deliverer-list.txt
  ```

  **Commit**: YES | Message: `feat(api): add group join-request endpoints` | Files: `backend/routers/orders.py`

### Wave 2 — Mobile: Remove Deliverer Surfaces + Join Request UI

- [ ] 5. Remove deliverer “Group Orders” section from Dashboard and DelivererQueue

  **What to do**:
  - `mobile/src/screens/DashboardScreen.tsx`:
    - In deliverer view (around the existing Group Orders card), delete that entire card.
  - `mobile/src/screens/DelivererQueueScreen.tsx`:
    - Remove `showGroupOnly` state and filter logic.
    - Remove the “Group Orders Only” UI toggle block.

  **Acceptance Criteria**:
  - [ ] No deliverer Group Orders card on Dashboard.
  - [ ] No group-only toggle on DelivererQueue.
  - [ ] `npx tsc --noEmit` passes.

  **QA Scenarios**:
  ```
  Scenario: Deliverer UI no longer advertises Group Orders
    Tool: Bash + (optional Expo run)
    Steps:
      1) Inspect Dashboard deliverer view and DelivererQueue screen.
      2) Run: cd mobile && npx tsc --noEmit
    Expected: Both UI elements removed; type-check passes.
    Evidence: .sisyphus/evidence/task-5-tsc.txt
  ```

  **Commit**: YES | Message: `fix(ui): remove deliverer group order entry points` | Files: `mobile/src/screens/DashboardScreen.tsx`, `mobile/src/screens/DelivererQueueScreen.tsx`

- [ ] 6. Mobile API + types for join requests

  **What to do**:
  - Update `mobile/src/types/index.ts`:
    - Add `JoinRequestStatus` union and `GroupOrderJoinRequest` interface matching backend response.
    - Extend `GroupOrderResponse` with `my_join_request?: GroupOrderJoinRequest | null` and `pending_join_requests_count?: number`.
  - Update `mobile/src/api/groupOrders.ts`:
    - Add functions:
      - `createJoinRequest(rootOrderId, note)` → `GroupOrderJoinRequest`
      - `listJoinRequests(rootOrderId)` → `GroupOrderJoinRequest[]`
      - `approveJoinRequest(joinRequestId)` → `GroupOrderJoinRequest`
      - `rejectJoinRequest(joinRequestId, reason?)` → `GroupOrderJoinRequest`
      - `cancelJoinRequest(joinRequestId)` → `GroupOrderJoinRequest`

  **Acceptance Criteria**:
  - [ ] Mobile compiles strictly (no `any`).

  **QA Scenarios**:
  ```
  Scenario: Type-check after adding join request types
    Tool: Bash
    Steps:
      1) cd mobile && npx tsc --noEmit
    Expected: Exit 0.
    Evidence: .sisyphus/evidence/task-6-tsc.txt
  ```

  **Commit**: YES | Message: `feat(mobile): add group join-request API client` | Files: `mobile/src/api/groupOrders.ts`, `mobile/src/types/index.ts`

- [ ] 7. Requester flow: “Request to Join” (reuse existing GroupOrderJoin screen)

  **What to do**:
  - Update `mobile/src/screens/GroupOrderJoinScreen.tsx`:
    - Change title/copy from “Join Group Order” to “Request to Join”.
    - Replace API call `joinGroupOrder` with `createJoinRequest`.
    - Success message should indicate approval is required: “Request sent. Waiting for deliverer approval.”
    - Handle 409/400 with specific messages:
      - If root not accepted: “You can request to join only after a deliverer accepts this group order.”
      - If picked up/closed: “Group is closed to new join requests.”

  **Acceptance Criteria**:
  - [ ] Requester can submit note and create join request.

  **QA Scenarios**:
  ```
  Scenario: Request-to-join shows pending message
    Tool: Bash (static) + optional Expo
    Steps:
      1) Confirm GroupOrderJoinScreen uses createJoinRequest.
    Expected: Success message indicates pending approval.
    Evidence: .sisyphus/evidence/task-7-requester-flow-notes.txt
  ```

  **Commit**: YES | Message: `feat(group-orders): requester join requests UI` | Files: `mobile/src/screens/GroupOrderJoinScreen.tsx`

- [ ] 8. Deliverer approval UI: show join requests in GroupOrderDetail + entry from OrderDetail

  **What to do**:
  - `mobile/src/screens/OrderDetailScreen.tsx`:
    - If `isDeliverer` and `order.group_order_id == null` and `order.is_group_open == true`, add a button:
      - Label: “Group Requests”
      - Action: `navigation.navigate('GroupOrderDetail', { rootOrderId: order.id })`
  - `mobile/src/screens/GroupOrderDetailScreen.tsx`:
    - For deliverer (isDeliverer) and root.status == 'accepted':
      - Fetch pending join requests via `listJoinRequests(rootOrderId)`.
      - Render a “Join Requests” section with each request:
        - requester nickname + note
        - Approve / Reject buttons
      - On Approve/Reject: call API then reload both group detail and join request list.
    - For requester viewing root:
      - If `data.my_join_request?.status == 'pending'`: show status badge and offer “Cancel Request”.
      - If rejected: show “Rejected” and disable new request button.
  - Disable joins after pickup:
    - If root.status != 'accepted' OR !data.is_open: hide “Request to Join”.

  **Acceptance Criteria**:
  - [ ] Deliverer can approve/reject requests from GroupOrderDetail.
  - [ ] Deliverer cannot approve self (server returns 403; client shows alert).
  - [ ] Requester sees pending/rejected/approved state.

  **QA Scenarios**:
  ```
  Scenario: Deliverer approves join request
    Tool: Bash (backend curl) + optional Expo
    Steps:
      1) Navigate OrderDetail as deliverer
      2) Tap Group Requests
      3) Approve a pending request
    Expected: Participant appears; request marked approved; no errors.
    Evidence: .sisyphus/evidence/task-8-approve-ui-notes.txt
  ```

  **Commit**: YES | Message: `feat(group-orders): deliverer approve join requests in UI` | Files: `mobile/src/screens/OrderDetailScreen.tsx`, `mobile/src/screens/GroupOrderDetailScreen.tsx`

### Wave 3 — Lucky Draw Wheel UI Polish + Verification

- [ ] 9. LuckyDrawWheelScreen: card hierarchy + wheel ring + center hub

  **What to do**:
  - Update `mobile/src/screens/LuckyDrawWheelScreen.tsx`:
    - Wrap result + wheel in a card styled like `OrderCard`:
      - `backgroundColor: t.colors.card`, `borderRadius: t.radius.xl`, `padding: t.spacing.lg`, `t.shadow.card`.
    - Add visual wheel polish:
      - In Svg, draw an outer ring circle with `stroke=t.colors.border`, `strokeWidth=6`.
      - Add a center hub circle (overlay) with `fill=t.colors.bg` and a smaller accent dot.
    - Improve spacing:
      - Use `t.spacing.*` instead of hard-coded 24/32 where possible.
    - Keep segment colors from theme and keep pointer pointing down.
    - Keep the spin math exactly unchanged.

  **References**:
  - Card pattern: `mobile/src/components/OrderCard.tsx`

  **Acceptance Criteria**:
  - [ ] Screen has clear card hierarchy (wheel inside card).
  - [ ] Wheel has visible ring + center hub.
  - [ ] `npx tsc --noEmit` passes.

  **QA Scenarios**:
  ```
  Scenario: Wheel UI polish present and still functional
    Tool: Bash (static) + Type-check
    Steps:
      1) Confirm ring + hub elements exist.
      2) Run: cd mobile && npx tsc --noEmit
    Expected: UI code updated; spin logic unchanged; type-check passes.
    Evidence: .sisyphus/evidence/task-9-wheel-tsc.txt
  ```

  **Commit**: YES | Message: `fix(ui): polish lucky draw wheel layout` | Files: `mobile/src/screens/LuckyDrawWheelScreen.tsx`

- [ ] 10. Verification wave: backend curl + type-check evidence capture

  **What to do**:
  - Run frontend type-check and save output:
    - `cd mobile && npx tsc --noEmit > ../.sisyphus/evidence/task-10-tsc.txt 2>&1`
  - Run backend manual smoke via curl (create users, create root, accept, request, approve, pickup):
    - Save all curl output to `.sisyphus/evidence/task-10-backend-curl.txt`.

  **Acceptance Criteria**:
  - [ ] Evidence shows request blocked pre-accept, works post-accept, blocked post-pickup.

  **Commit**: NO

## Final Verification Wave (4 parallel agents, ALL must APPROVE)
- [ ] F1. Plan Compliance Audit — oracle
- [ ] F2. Code Quality Review — unspecified-high
- [ ] F3. RN UX Review (wheel + group flows) — visual-engineering
- [ ] F4. Scope Fidelity Check — deep

## Commit Strategy
- Backend model addition: ensure `git add -f backend/models/*.py` due to root `.gitignore` `models/` rule.
- Keep commits atomic: backend model/schemas, backend services/routers, mobile UI wiring, wheel UI.

## Success Criteria
- Deliverer sees no “Group Orders” section on Dashboard/Queue.
- Join is never immediate; joins only happen after deliverer approval post-accept.
- No join requests allowed after pickup.
- Lucky Draw wheel looks consistent with app card design.
