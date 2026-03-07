# Chat, Rating, Business Rules & UI Enhancements

## TL;DR

> **Quick Summary**: Add polling-based ephemeral chat, inline rating system with public leaderboard, one-active-order business rule, "My Orders" screen, in-app toast notifications, and animated order timeline to the DeliverU app.
> 
> **Deliverables**:
> - Backend: Rating model + router/service, Chat message model + router/service, Stats leaderboard endpoint, Active-order enforcement
> - Frontend: ChatScreen, MyOrdersScreen, StarRating component, Toast notification system, animated timeline, stats cards on Dashboard
> 
> **Estimated Effort**: Large
> **Parallel Execution**: YES — 4 waves
> **Critical Path**: Task 1 → Task 4 → Task 8 → Task 11

---

## Context

### Original Request
User requested a batch of features: temporary chat between orderer & deliverer, rating & review system with inline 5-star default, public leaderboard stats, one-active-order limit, "My Orders" in the orderer view, pop-up notifications for order state changes, and an animated timeline for order progress.

### Interview Summary
**Key Discussions**:
- **QR takeaway validation**: Skipped for now — format unknown, will implement later
- **Rating behavior**: Pre-filled 5 stars, user must tap "Submit" to confirm (no auto-submit server-side)
- **Chat approach**: HTTP polling every 3-5 seconds (no WebSocket for v1)
- **Stats visibility**: Public leaderboard visible to all users
- **"My Orders" placement**: Card below "Order Food" on orderer Dashboard view
- **Self-delivery prevention**: Already exists at `order_service.py:84` — no new work needed
- **"Finished" order**: Both "delivered" AND "cancelled" are terminal states for the active-order check
- **Timeline animation**: Enhance existing `renderTimelineItem` in OrderDetailScreen with connecting lines + pulse animation using built-in `Animated` API

### Research Findings
- `@expo/vector-icons` (Ionicons) included with Expo SDK — use for star icons, no install needed
- Built-in `Animated` API already used in `DashboardScreen.tsx` — sufficient for timeline, no Reanimated needed
- `getMyOrders()` API function exists in `api/orders.ts:19-22` but is never called — ready to use
- `useFocusEffect` pattern exists in `DelivererQueueScreen.tsx` — use for polling
- No `__init__.py` in `backend/models/` or `backend/routers/` — direct imports used everywhere

### Metis Review
**Identified Gaps** (addressed):
- Hidden dependency: Polling infrastructure needed for chat, notifications, and timeline — addressed as polling in OrderDetailScreen + ChatScreen
- No real-time mechanism exists — HTTP polling chosen as v1 approach
- QR takeaway validation format unknown — deferred per user decision
- Rating auto-submit ambiguity — resolved: pre-filled 5 stars with manual submit

---

## Work Objectives

### Core Objective
Add chat, rating, leaderboard, business rules, notifications, and timeline animation to complete the order lifecycle experience for both orderer and deliverer.

### Concrete Deliverables
- `backend/models/rating.py` — Rating SQLAlchemy model
- `backend/models/message.py` — ChatMessage SQLAlchemy model
- `backend/schemas/rating.py` — Rating Pydantic schemas
- `backend/schemas/chat.py` — Chat Pydantic schemas
- `backend/services/rating_service.py` — Rating business logic
- `backend/services/chat_service.py` — Chat business logic
- `backend/routers/ratings.py` — Rating endpoints
- `backend/routers/chat.py` — Chat endpoints (polling-based)
- `backend/routers/stats.py` — Leaderboard endpoint
- Modified `backend/services/order_service.py` — Active order check + chat cleanup on completion
- Modified `backend/models/user.py` — Add `average_rating`, `total_ratings` fields
- Modified `backend/main.py` — Register new routers
- `mobile/src/screens/ChatScreen.tsx` — Chat UI with polling
- `mobile/src/screens/MyOrdersScreen.tsx` — User's own orders list
- `mobile/src/components/StarRating.tsx` — Custom inline star rating component
- `mobile/src/components/Toast.tsx` — Toast notification banner
- `mobile/src/context/ToastContext.tsx` — Toast state management
- `mobile/src/api/chat.ts` — Chat API client
- `mobile/src/api/ratings.ts` — Rating API client
- `mobile/src/api/stats.ts` — Stats API client
- Modified `mobile/src/types/index.ts` — New types + screen params
- Modified `mobile/src/navigation/RootNavigator.tsx` — New screen routes
- Modified `mobile/src/screens/DashboardScreen.tsx` — My Orders card + stats section
- Modified `mobile/src/screens/OrderDetailScreen.tsx` — Rating row, chat button, animated timeline, polling

### Definition of Done
- [ ] `npx tsc --noEmit` passes with exit code 0 from `mobile/`
- [ ] Backend starts without errors: `uvicorn main:app --reload` from `backend/`
- [ ] All new endpoints respond correctly via curl
- [ ] Full order lifecycle works: create → accept → pickup → deliver → rate
- [ ] Chat messages send/receive between orderer and deliverer during active order
- [ ] Chat messages are deleted on order completion/cancellation
- [ ] Dashboard orderer view shows "Order Food" + "My Orders" cards + stats
- [ ] Toast notifications appear on OrderDetailScreen when status changes via polling
- [ ] Timeline animates with connecting lines and pulse on active step

### Must Have
- Inline 5-star rating row (pre-filled 5, manual submit) on OrderDetailScreen for delivered orders
- Both orderer and deliverer rate each other independently
- HTTP polling-based chat (POST to send, GET to fetch with `since` param)
- System messages auto-created on order acceptance (delivery preference)
- Chat messages deleted on order completion/cancellation
- One active order at a time enforcement (HTTP 409 if user has pending/accepted/picked_up order)
- "My Orders" card on orderer Dashboard navigating to MyOrdersScreen
- Public leaderboard (top orderers by count, top deliverers by rating)
- In-app toast notification when order status changes (polling-based)
- Animated timeline with connecting lines and pulse effect on active step
- Dark mode support on all new screens/components

### Must NOT Have (Guardrails)
- NO WebSocket or Socket.IO — use HTTP polling only
- NO push notification libraries (FCM, APNs) — in-app toast only
- NO `react-native-reanimated` or heavy animation libs — use built-in `Animated` API
- NO admin dashboard — simple stats cards only
- NO QR takeaway validation (deferred)
- NO `from typing import List, Optional` — use `list[str]`, `str | None`
- NO `any` types, `@ts-ignore`, `as any` in TypeScript
- NO auto-submit rating server-side — user must manually submit
- NO chat history after order completion — messages are deleted
- NO new npm/pip dependencies unless absolutely necessary (prefer built-in)
- NO inline style objects — use `StyleSheet.create()`
- NO excessive JSDoc/comments — keep to pattern of existing codebase

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: NO (no pytest, jest, or any test framework)
- **Automated tests**: None
- **Framework**: None available
- **Verification**: `npx tsc --noEmit` for frontend, `curl` for backend endpoints

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Backend**: Use Bash (curl) — Send requests, assert status + response fields
- **Frontend**: Use Bash (`npx tsc --noEmit`) — Type-check all changes

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — all backend, independent):
├── Task 1: Rating Model + User fields + Schemas [quick]
├── Task 2: Active Order Business Rule [quick]
├── Task 3: Chat Model + Schemas [quick]

Wave 2 (After Wave 1 — backend services/routers, parallel):
├── Task 4: Rating Service + Router [unspecified-high]
├── Task 5: Chat Service + Router [unspecified-high]
├── Task 6: Stats Leaderboard Endpoint [quick]
├── Task 7: Register all new routers in main.py + order_service hooks [quick]

Wave 3 (After Wave 2 — frontend screens, parallel):
├── Task 8: Frontend Types + API Clients (ratings, chat, stats) [quick]
├── Task 9: MyOrdersScreen + Dashboard "My Orders" card [visual-engineering]
├── Task 10: ChatScreen with polling [visual-engineering]
├── Task 11: Inline Rating UI on OrderDetailScreen [visual-engineering]

Wave 4 (After Wave 3 — UI polish, parallel):
├── Task 12: Toast Notification System + OrderDetail polling [visual-engineering]
├── Task 13: Animated Timeline Enhancement [visual-engineering]
├── Task 14: Stats Cards on Dashboard [visual-engineering]
├── Task 15: Navigation Registration + Final Wiring [quick]

Wave FINAL (After ALL tasks — independent review, 4 parallel):
├── Task F1: Plan compliance audit [oracle]
├── Task F2: Code quality review (tsc --noEmit + code review) [unspecified-high]
├── Task F3: Real QA — full lifecycle test via curl + tsc [unspecified-high]
├── Task F4: Scope fidelity check [deep]

Critical Path: Task 1 → Task 4 → Task 7 → Task 8 → Task 11 → Task 13
Parallel Speedup: ~65% faster than sequential (15 tasks → 4+1 waves)
Max Concurrent: 4 (Waves 2, 3, 4)
```

### Dependency Matrix

| Task | Depends On | Blocks | Wave |
|------|-----------|--------|------|
| 1 | — | 4, 6, 7, 8 | 1 |
| 2 | — | 7, 9 | 1 |
| 3 | — | 5, 7, 8 | 1 |
| 4 | 1 | 7, 8 | 2 |
| 5 | 3 | 7, 8 | 2 |
| 6 | 1 | 8, 14 | 2 |
| 7 | 1, 2, 3, 4, 5 | 8-15 | 2 |
| 8 | 4, 5, 6 | 9, 10, 11, 14 | 3 |
| 9 | 2, 8 | 12 | 3 |
| 10 | 5, 8 | — | 3 |
| 11 | 4, 8 | 13 | 3 |
| 12 | 9 | — | 4 |
| 13 | 11 | — | 4 |
| 14 | 6, 8 | — | 4 |
| 15 | 8-14 | F1-F4 | 4 |

### Agent Dispatch Summary

- **Wave 1**: 3 tasks — T1 → `quick`, T2 → `quick`, T3 → `quick`
- **Wave 2**: 4 tasks — T4 → `unspecified-high`, T5 → `unspecified-high`, T6 → `quick`, T7 → `quick`
- **Wave 3**: 4 tasks — T8 → `quick`, T9 → `visual-engineering`, T10 → `visual-engineering`, T11 → `visual-engineering`
- **Wave 4**: 4 tasks — T12 → `visual-engineering`, T13 → `visual-engineering`, T14 → `visual-engineering`, T15 → `quick`
- **FINAL**: 4 tasks — F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high`, F4 → `deep`

---

## TODOs

- [x] 1. Create Rating Model + User Rating Fields + Rating Schemas

  **What to do**:
  - Create `backend/models/rating.py` with a `Rating` model:
    - `id`: String, UUID PK (same pattern as `Order` model)
    - `order_id`: String, ForeignKey("orders.id"), nullable=False
    - `rater_id`: String, ForeignKey("users.id"), nullable=False (who is giving the rating)
    - `ratee_id`: String, ForeignKey("users.id"), nullable=False (who is being rated)
    - `stars`: Integer, nullable=False (1-5)
    - `feedback`: String, nullable=True, default=None
    - `created_at`: DateTime(timezone=True), default=utcnow
  - Add two fields to `backend/models/user.py` User model:
    - `average_rating`: Float, nullable=True, default=None
    - `total_ratings`: Integer, default=0
  - Create `backend/schemas/rating.py` with:
    - `RateRequest(BaseModel)`: `stars: int` (1-5, validated with `field_validator`), `feedback: str | None = None`
    - `RatingResponse(BaseModel)`: `id, order_id, rater_id, ratee_id, stars, feedback, created_at`, `model_config = {"from_attributes": True}`
  - Add `from models.rating import Rating` in `backend/models/order.py` at the top (so SQLAlchemy sees it for table creation). OR just ensure the model is imported somewhere before `Base.metadata.create_all` runs — the safest approach is to import it in `backend/main.py` alongside the existing model imports.

  **Must NOT do**:
  - Do NOT use `from typing import Optional` — use `str | None`
  - Do NOT auto-create ratings server-side — the rating service (Task 4) will handle submission
  - Do NOT add relationships to the model — keep it simple like Order model

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []
    - No specialized skills needed — straightforward SQLAlchemy model + Pydantic schema
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: No frontend work in this task

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3)
  - **Blocks**: Tasks 4, 6, 7, 8
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - `backend/models/order.py:10-52` — Follow this exact pattern: UUID PK with `default=lambda: str(uuid.uuid4())`, `Mapped[]` + `mapped_column()`, DateTime with timezone
  - `backend/models/user.py:1-40` — User model to add `average_rating` and `total_ratings` fields to
  - `backend/models/credit_transaction.py` — Another model example with ForeignKey pattern

  **API/Type References**:
  - `backend/schemas/order.py:13-19` — Schema pattern with `BaseModel`, `field_validator`, `model_config`
  - `backend/schemas/auth.py` — Another schema example for request/response pattern

  **External References**:
  - SQLAlchemy 2.0 Mapped columns: https://docs.sqlalchemy.org/en/20/orm/mapped_attributes.html

  **WHY Each Reference Matters**:
  - `order.py` model: Copy exact UUID PK pattern, DateTime pattern, import structure
  - `user.py` model: This is the file being modified — know its current shape exactly
  - `order.py` schema: Copy `field_validator` pattern for stars validation (1-5 range)

  **Acceptance Criteria**:
  - [ ] File `backend/models/rating.py` exists with Rating class
  - [ ] `backend/models/user.py` has `average_rating` and `total_ratings` fields
  - [ ] File `backend/schemas/rating.py` exists with RateRequest and RatingResponse
  - [ ] Stars validation rejects values outside 1-5

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Rating model file is valid Python with correct structure
    Tool: Bash
    Preconditions: Backend code exists
    Steps:
      1. Run `python -c "from models.rating import Rating; print(Rating.__tablename__)"` from backend/
      2. Assert output is "ratings"
      3. Run `python -c "from models.user import User; print(hasattr(User, 'average_rating'), hasattr(User, 'total_ratings'))"` from backend/
      4. Assert output is "True True"
    Expected Result: Both imports succeed, table name is "ratings", User has new fields
    Failure Indicators: ImportError, AttributeError, wrong tablename
    Evidence: .sisyphus/evidence/task-1-model-import.txt

  Scenario: Rating schema validates star range
    Tool: Bash
    Preconditions: Schema file exists
    Steps:
      1. Run `python -c "from schemas.rating import RateRequest; RateRequest(stars=5); print('valid')"` from backend/
      2. Run `python -c "from schemas.rating import RateRequest; RateRequest(stars=0)"` from backend/
      3. Assert first succeeds, second raises ValidationError
    Expected Result: stars=5 valid, stars=0 rejected
    Failure Indicators: stars=0 accepted, import error
    Evidence: .sisyphus/evidence/task-1-schema-validation.txt
  ```

  **Commit**: YES (groups with Wave 1)
  - Message: `feat(backend): add rating model, user rating fields, and rating schemas`
  - Files: `backend/models/rating.py`, `backend/models/user.py`, `backend/schemas/rating.py`
  - Pre-commit: `python -c "from models.rating import Rating"` from backend/

- [x] 2. Add Active Order Business Rule

  **What to do**:
  - In `backend/services/order_service.py` `create_order()` function, BEFORE the credit check (line 25):
    - Query for any existing order where `orderer_id == user.id` AND `status IN ('pending', 'accepted', 'picked_up')`
    - If found, raise `HTTPException(status_code=status.HTTP_409_CONFLICT, detail="You already have an active order. Please wait for it to complete before placing a new one.")`
  - This enforces the "one active order at a time" rule
  - Both "delivered" and "cancelled" are terminal states — user can order again after either

  **Must NOT do**:
  - Do NOT modify any other function in order_service.py
  - Do NOT add QR takeaway validation (deferred)
  - Do NOT touch accept_order (self-delivery check already exists at line 84)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []
    - Simple query + exception — 10 lines of code
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: No frontend work

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3)
  - **Blocks**: Tasks 7, 9
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - `backend/services/order_service.py:13-47` — `create_order()` function — this is the exact function to modify. Add the active order check BEFORE the credit check at line 25
  - `backend/services/order_service.py:79-88` — Example of query + validation pattern (accept_order checks orderer_id)

  **API/Type References**:
  - `backend/models/order.py:24` — `Order.status` field and its possible values
  - `backend/schemas/order.py:10` — `VALID_ORDER_STATUSES` list for reference

  **WHY Each Reference Matters**:
  - `create_order()`: The exact function to modify — need to insert check before credit deduction
  - `accept_order()`: Shows the pattern for query + HTTPException that this task should follow

  **Acceptance Criteria**:
  - [ ] Creating a second order while first is pending/accepted/picked_up returns HTTP 409
  - [ ] Creating an order after previous is delivered returns HTTP 201
  - [ ] Creating an order after previous is cancelled returns HTTP 201

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Second order blocked while first is active
    Tool: Bash (curl)
    Preconditions: Backend running, user has auth token, user has an active pending order
    Steps:
      1. curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:8000/orders -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"canteen":"LG1","items":[{"name":"test","qty":1,"price":10}],"total_price":10,"delivery_hall":"Hall I"}'
      2. Assert HTTP status is 409
      3. Parse response body and assert detail contains "active order"
    Expected Result: HTTP 409 with descriptive error message
    Failure Indicators: HTTP 201 (order created despite active order existing)
    Evidence: .sisyphus/evidence/task-2-active-order-block.txt

  Scenario: Order allowed after previous is delivered
    Tool: Bash (curl)
    Preconditions: User's previous order has status "delivered"
    Steps:
      1. curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:8000/orders -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"canteen":"LG1","items":[{"name":"test","qty":1,"price":10}],"total_price":10,"delivery_hall":"Hall I"}'
      2. Assert HTTP status is 201
    Expected Result: HTTP 201, new order created successfully
    Failure Indicators: HTTP 409 when no active order exists
    Evidence: .sisyphus/evidence/task-2-order-after-delivered.txt
  ```

  **Commit**: YES (groups with Wave 1)
  - Message: `feat(backend): enforce one active order at a time`
  - Files: `backend/services/order_service.py`
  - Pre-commit: None (no test framework)

- [x] 3. Create Chat Message Model + Schemas

  **What to do**:
  - Create `backend/models/message.py` with `ChatMessage` model:
    - `id`: String, UUID PK (same pattern as Order)
    - `order_id`: String, ForeignKey("orders.id"), nullable=False
    - `sender_id`: String, ForeignKey("users.id"), nullable=False
    - `content`: Text, nullable=False
    - `message_type`: String, nullable=False, default="text" (values: "text", "system")
    - `created_at`: DateTime(timezone=True), default=utcnow
  - Create `backend/schemas/chat.py` with:
    - `SendMessageRequest(BaseModel)`: `content: str`
    - `ChatMessageResponse(BaseModel)`: `id, order_id, sender_id, sender_nickname: str, content, message_type, created_at`, `model_config = {"from_attributes": True}`
  - Ensure the ChatMessage model is imported in `backend/main.py` so tables auto-create

  **Must NOT do**:
  - Do NOT add WebSocket infrastructure — this is just the data model
  - Do NOT use `from typing import Optional`
  - Do NOT add an Enum type for message_type — use plain String (matches the pattern used for Order.status)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []
    - Simple model + schema creation following existing patterns
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: No frontend work

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2)
  - **Blocks**: Tasks 5, 7, 8
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - `backend/models/order.py:10-52` — Follow this exact model pattern: UUID PK, ForeignKey, DateTime, Mapped[] + mapped_column()
  - `backend/schemas/order.py:47-70` — Follow OrderResponse pattern for ChatMessageResponse (model_config, from_attributes)

  **API/Type References**:
  - `backend/database.py` — `Base` import for model declaration

  **WHY Each Reference Matters**:
  - `order.py` model: Exact pattern to replicate — UUID, ForeignKey, timestamps
  - `order.py` schema: Response schema pattern with `model_config`

  **Acceptance Criteria**:
  - [ ] File `backend/models/message.py` exists with ChatMessage class
  - [ ] File `backend/schemas/chat.py` exists with SendMessageRequest and ChatMessageResponse
  - [ ] ChatMessage model imports successfully

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Chat model is valid Python with correct structure
    Tool: Bash
    Preconditions: Backend code exists
    Steps:
      1. Run `python -c "from models.message import ChatMessage; print(ChatMessage.__tablename__)"` from backend/
      2. Assert output is "chat_messages"
      3. Run `python -c "from schemas.chat import SendMessageRequest, ChatMessageResponse; print('ok')"` from backend/
      4. Assert output is "ok"
    Expected Result: Both imports succeed, table name is "chat_messages"
    Failure Indicators: ImportError, wrong tablename
    Evidence: .sisyphus/evidence/task-3-model-import.txt
  ```

  **Commit**: YES (groups with Wave 1)
  - Message: `feat(backend): add chat message model and schemas`
  - Files: `backend/models/message.py`, `backend/schemas/chat.py`
  - Pre-commit: `python -c "from models.message import ChatMessage"` from backend/

- [x] 4. Create Rating Service + Router

  **What to do**:
  - Create `backend/services/rating_service.py` with:
    - `async def submit_rating(db, order_id, rater_id, stars, feedback) -> Rating`:
      - Query the order — must exist and be in "delivered" status
      - Verify rater is either orderer or deliverer of this order
      - Determine ratee: if rater is orderer → ratee is deliverer. If rater is deliverer → ratee is orderer
      - Check if rating already exists for this rater+order combo — if so, UPDATE it instead of creating new
      - Create/update the Rating record
      - Recalculate ratee's `average_rating` and `total_ratings` on User model (query all ratings where ratee_id matches, compute AVG)
      - Return the rating
    - `async def get_order_ratings(db, order_id) -> list[Rating]`:
      - Return all ratings for a given order
  - Create `backend/routers/ratings.py` with:
    - `POST /orders/{order_id}/rate` — calls `submit_rating`, requires auth. Returns RatingResponse
    - `GET /orders/{order_id}/ratings` — calls `get_order_ratings`, requires auth (only orderer/deliverer can view). Returns list[RatingResponse]
  - Router prefix: Use `APIRouter(prefix="/orders", tags=["ratings"])` so endpoints are `/orders/{id}/rate` and `/orders/{id}/ratings`

  **Must NOT do**:
  - Do NOT auto-create ratings on delivery — user submits manually with pre-filled 5 stars (frontend handles pre-fill)
  - Do NOT allow rating if order is not delivered
  - Do NOT allow rating by someone not involved in the order
  - Do NOT create a separate `/ratings` prefix — nest under `/orders/{id}`

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []
    - Business logic with multiple validation rules and aggregation
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: No frontend work

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 5, 6, 7)
  - **Blocks**: Tasks 7, 8, 11
  - **Blocked By**: Task 1 (needs Rating model and User rating fields)

  **References**:

  **Pattern References**:
  - `backend/services/order_service.py:70-93` — `accept_order()` pattern: query order, validate status, validate user role, modify and return
  - `backend/services/order_service.py:121-149` — `deliver_order()` pattern: query order, validate, modify, query related user, call side effect
  - `backend/routers/orders.py:134-144` — Router endpoint pattern: Depends(get_current_user), Depends(get_db), call service, commit, refresh, return response

  **API/Type References**:
  - `backend/models/rating.py` — Rating model (created in Task 1)
  - `backend/schemas/rating.py` — RateRequest, RatingResponse (created in Task 1)
  - `backend/models/user.py` — User.average_rating, User.total_ratings (added in Task 1)

  **WHY Each Reference Matters**:
  - `accept_order()`: Same pattern — validate order exists, check status, verify user role
  - `deliver_order()`: Shows how to query a related user and perform side effects (like updating user stats)
  - Router pattern: Copy the exact Depends + commit + refresh pattern

  **Acceptance Criteria**:
  - [ ] `POST /orders/{id}/rate` with valid token and stars=5 returns 200 with rating data
  - [ ] `POST /orders/{id}/rate` on non-delivered order returns 400
  - [ ] `POST /orders/{id}/rate` by non-participant returns 403
  - [ ] Submitting rating twice updates existing rating (upsert behavior)
  - [ ] After rating, ratee's `average_rating` is recalculated
  - [ ] `GET /orders/{id}/ratings` returns ratings array

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Submit rating on delivered order
    Tool: Bash (curl)
    Preconditions: Backend running, an order exists with status "delivered", orderer has auth token
    Steps:
      1. curl -s -X POST http://localhost:8000/orders/{order_id}/rate -H "Authorization: Bearer $ORDERER_TOKEN" -H "Content-Type: application/json" -d '{"stars":5,"feedback":"great delivery"}'
      2. Assert HTTP 200
      3. Assert response has "stars": 5 and "feedback": "great delivery"
      4. curl -s http://localhost:8000/orders/{order_id}/ratings -H "Authorization: Bearer $ORDERER_TOKEN"
      5. Assert response is array with 1 rating
    Expected Result: Rating created and retrievable
    Failure Indicators: HTTP 400/404/500, empty ratings array
    Evidence: .sisyphus/evidence/task-4-submit-rating.txt

  Scenario: Rating rejected on non-delivered order
    Tool: Bash (curl)
    Preconditions: An order exists with status "pending"
    Steps:
      1. curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:8000/orders/{order_id}/rate -H "Authorization: Bearer $TOKEN" -d '{"stars":5}'
      2. Assert HTTP 400
    Expected Result: HTTP 400 with error about order not being delivered
    Failure Indicators: HTTP 200 (rating accepted on non-delivered order)
    Evidence: .sisyphus/evidence/task-4-rating-rejected-pending.txt
  ```

  **Commit**: YES (groups with Wave 2)
  - Message: `feat(backend): add rating service and router with upsert support`
  - Files: `backend/services/rating_service.py`, `backend/routers/ratings.py`
  - Pre-commit: None

- [x] 5. Create Chat Service + Router (Polling-Based)

  **What to do**:
  - Create `backend/services/chat_service.py` with:
    - `async def send_message(db, order_id, sender_id, content) -> ChatMessage`:
      - Query the order — must exist and be in "accepted" or "picked_up" status
      - Verify sender is either orderer or deliverer of this order
      - Create ChatMessage record with message_type="text"
      - Return the message
    - `async def get_messages(db, order_id, user_id, since: datetime | None = None) -> list[ChatMessage]`:
      - Verify user is orderer or deliverer of this order
      - Query ChatMessage where order_id matches, ordered by created_at ASC
      - If `since` is provided, filter `created_at > since` (for polling — only new messages)
      - Return messages list
    - `async def create_system_message(db, order_id, content) -> ChatMessage`:
      - Create ChatMessage with message_type="system", sender_id=orderer_id
      - Used to auto-create "Order accepted! Chat is now available." on order acceptance
    - `async def delete_chat(db, order_id) -> None`:
      - Delete ALL ChatMessage records where order_id matches
      - Called on order completion (delivered) or cancellation
  - Create `backend/routers/chat.py` with:
    - `POST /orders/{order_id}/chat` — calls `send_message`. Body: `SendMessageRequest`. Returns `ChatMessageResponse`. Status 201.
    - `GET /orders/{order_id}/chat?since={iso_timestamp}` — calls `get_messages`. `since` is optional query param. Returns `list[ChatMessageResponse]`.
    - Both endpoints require auth via `Depends(get_current_user)`
  - Router: `APIRouter(prefix="/orders", tags=["chat"])`
  - `sender_nickname` in response: query User.nickname for sender_id, set on response dict

  **Must NOT do**:
  - Do NOT add WebSocket or Socket.IO — HTTP polling only
  - Do NOT allow chat on pending, delivered, or cancelled orders
  - Do NOT implement read receipts or typing indicators
  - Do NOT paginate messages (ephemeral, short-lived chats)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 4, 6, 7)
  - **Blocks**: Tasks 7, 8, 10
  - **Blocked By**: Task 3 (needs ChatMessage model and schemas)

  **References**:

  **Pattern References**:
  - `backend/services/order_service.py:70-93` — `accept_order()`: query order, validate status, validate user role
  - `backend/services/order_service.py:96-119` — `pickup_order()`: similar validation flow
  - `backend/routers/orders.py:134-144` — Router endpoint pattern with Depends, commit, refresh
  - `backend/routers/orders.py:80-95` — GET endpoint returning list pattern

  **API/Type References**:
  - `backend/models/message.py` — ChatMessage model (Task 3)
  - `backend/schemas/chat.py` — SendMessageRequest, ChatMessageResponse (Task 3)
  - `backend/models/order.py:24` — Order.status field
  - `backend/models/user.py:20` — User.nickname for sender_nickname

  **WHY Each Reference Matters**:
  - `accept_order()`: Same query → validate → act pattern to reuse
  - User.nickname: Must populate sender_nickname in response

  **Acceptance Criteria**:
  - [ ] `POST /orders/{id}/chat` with valid token returns 201 with message data
  - [ ] `POST /orders/{id}/chat` on pending order returns 400
  - [ ] `POST /orders/{id}/chat` by non-participant returns 403
  - [ ] `GET /orders/{id}/chat` returns messages array ordered by created_at
  - [ ] `GET /orders/{id}/chat?since=<timestamp>` returns only newer messages
  - [ ] `delete_chat()` removes all messages for an order

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Send and retrieve chat message
    Tool: Bash (curl)
    Preconditions: Backend running, order in "accepted" status, orderer has auth token
    Steps:
      1. curl -s -w "\n%{http_code}" -X POST http://localhost:8000/orders/{order_id}/chat -H "Authorization: Bearer $ORDERER_TOKEN" -H "Content-Type: application/json" -d '{"content":"Hello deliverer!"}'
      2. Assert HTTP 201 and response has "content": "Hello deliverer!", "message_type": "text"
      3. curl -s http://localhost:8000/orders/{order_id}/chat -H "Authorization: Bearer $ORDERER_TOKEN"
      4. Assert response is array with at least 1 message with sender_nickname not null
    Expected Result: Message created and retrievable with nickname
    Evidence: .sisyphus/evidence/task-5-send-receive-chat.txt

  Scenario: Chat blocked on pending order
    Tool: Bash (curl)
    Preconditions: Order in "pending" status
    Steps:
      1. curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:8000/orders/{order_id}/chat -H "Authorization: Bearer $TOKEN" -d '{"content":"test"}'
      2. Assert HTTP 400
    Expected Result: HTTP 400 — chat not available on pending orders
    Evidence: .sisyphus/evidence/task-5-chat-blocked-pending.txt

  Scenario: Polling with since parameter
    Tool: Bash (curl)
    Preconditions: Order accepted, 2+ messages with different timestamps
    Steps:
      1. Send first message, note created_at. Wait 1s. Send second message.
      2. GET /orders/{id}/chat?since={first_timestamp}
      3. Assert response contains ONLY the second message
    Expected Result: Only messages after 'since' returned
    Evidence: .sisyphus/evidence/task-5-polling-since.txt
  ```

  **Commit**: YES (groups with Wave 2)
  - Message: `feat(backend): add chat service and router with polling support`
  - Files: `backend/services/chat_service.py`, `backend/routers/chat.py`


- [x] 6. Create Stats Leaderboard Endpoint

  **What to do**:
  - Create `backend/schemas/stats.py` with:
    - `LeaderboardEntry(BaseModel)`: `user_id: str`, `nickname: str`, `value: float`, `total_orders: int | None = None`, `total_ratings: int | None = None`
    - `LeaderboardResponse(BaseModel)`: `top_orderers: list[LeaderboardEntry]`, `top_deliverers: list[LeaderboardEntry]`
  - Create `backend/routers/stats.py` with:
    - `GET /stats/leaderboard` — Public endpoint (no auth required)
    - Top 5 orderers: count of orders where orderer_id = user.id AND status = 'delivered', ordered by count DESC
    - Top 5 deliverers: Users with total_ratings > 0, ordered by average_rating DESC, then total_ratings DESC
  - Router: `APIRouter(prefix="/stats", tags=["stats"])`
  - Use `func.count()` + `group_by()` for orderer aggregation, simple query + order_by for deliverers

  **Must NOT do**:
  - Do NOT require authentication — leaderboard is public
  - Do NOT build an admin dashboard — just a data endpoint
  - Do NOT expose sensitive user data (email, phone) — only nickname and stats

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 4, 5, 7)
  - **Blocks**: Tasks 8, 14
  - **Blocked By**: Task 1 (needs User.average_rating, User.total_ratings)

  **References**:

  **Pattern References**:
  - `backend/routers/orders.py:80-95` — GET endpoint pattern returning list data
  - `backend/services/order_service.py:26-39` — Example of query with filter conditions

  **API/Type References**:
  - `backend/models/user.py` — User.nickname, User.average_rating, User.total_ratings
  - `backend/models/order.py` — Order.orderer_id, Order.status for counting delivered orders

  **WHY Each Reference Matters**:
  - Orders router GET: Pattern for endpoint returning list data
  - User/Order models: Fields to query for leaderboard rankings

  **Acceptance Criteria**:
  - [ ] `GET /stats/leaderboard` returns 200 with `top_orderers` and `top_deliverers` arrays
  - [ ] Each entry has `user_id`, `nickname`, `value`
  - [ ] No auth required — request without token succeeds
  - [ ] Empty arrays returned when no data (not null or error)

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Leaderboard returns data without authentication
    Tool: Bash (curl)
    Preconditions: Backend running
    Steps:
      1. curl -s -w "\n%{http_code}" http://localhost:8000/stats/leaderboard
      2. Assert HTTP 200
      3. Assert response has "top_orderers" and "top_deliverers" arrays
    Expected Result: HTTP 200 with leaderboard data, no auth needed
    Evidence: .sisyphus/evidence/task-6-leaderboard.txt

  Scenario: Empty leaderboard on fresh database
    Tool: Bash (curl)
    Steps:
      1. curl -s http://localhost:8000/stats/leaderboard
      2. Assert "top_orderers": [] and "top_deliverers": []
    Expected Result: Empty arrays, no errors
    Evidence: .sisyphus/evidence/task-6-leaderboard-empty.txt
  ```

  **Commit**: YES (groups with Wave 2)
  - Message: `feat(backend): add public leaderboard endpoint`
  - Files: `backend/routers/stats.py`, `backend/schemas/stats.py`

- [x] 7. Register New Routers in main.py + Order Service Hooks

  **What to do**:
  - In `backend/main.py`:
    - Import models: `from models.rating import Rating`, `from models.message import ChatMessage`
    - Import routers: `from routers import ratings as ratings_router`, `from routers import chat as chat_router`, `from routers import stats as stats_router`
    - Register: `app.include_router(ratings_router.router)`, `app.include_router(chat_router.router)`, `app.include_router(stats_router.router)`
  - In `backend/services/order_service.py`:
    - Import `from services.chat_service import create_system_message, delete_chat`
    - In `accept_order()` after status update: `await create_system_message(db, order_id, "Order accepted! Chat is now available.")`
    - In `deliver_order()` after status update: `await delete_chat(db, order_id)`
    - In `cancel_order()` after status update: `await delete_chat(db, order_id)`

  **Must NOT do**:
  - Do NOT modify any router logic — only register them
  - Do NOT change existing router registration order

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (runs LAST — depends on Tasks 4, 5, 6)
  - **Blocks**: Tasks 8-15
  - **Blocked By**: Tasks 1, 2, 3, 4, 5, 6

  **References**:

  **Pattern References**:
  - `backend/main.py:1-37` — Current imports + router registrations — add new ones in same style
  - `backend/services/order_service.py:70-93` — `accept_order()`: insert system message call after status update
  - `backend/services/order_service.py:121-149` — `deliver_order()`: insert delete_chat after status update
  - `backend/services/order_service.py:151-180` — `cancel_order()`: insert delete_chat after status update

  **API/Type References**:
  - `backend/routers/ratings.py`, `backend/routers/chat.py`, `backend/routers/stats.py` — router objects to register
  - `backend/services/chat_service.py` — `create_system_message`, `delete_chat` functions

  **Acceptance Criteria**:
  - [ ] Backend starts without errors
  - [ ] All 3 new route groups visible in OpenAPI spec (/docs)
  - [ ] Accepting order creates system chat message
  - [ ] Delivering order deletes chat messages
  - [ ] Cancelling order deletes chat messages

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Backend starts with all routers registered
    Tool: Bash
    Steps:
      1. Start backend: uvicorn main:app --host 0.0.0.0 --port 8000 (from backend/)
      2. curl -s http://localhost:8000/health — assert {"status": "ok"}
      3. curl -s http://localhost:8000/openapi.json | check for 'rate', 'chat', 'stats' in paths
    Expected Result: Backend healthy, all 3 new route groups in OpenAPI
    Evidence: .sisyphus/evidence/task-7-router-registration.txt

  Scenario: Chat cleanup on order delivery
    Tool: Bash (curl)
    Preconditions: Order accepted with chat messages
    Steps:
      1. Send chat message to order
      2. Verify message exists via GET
      3. Progress order: pickup then deliver
      4. GET chat again — assert empty array
    Expected Result: Chat messages deleted after delivery
    Evidence: .sisyphus/evidence/task-7-chat-cleanup.txt
  ```

  **Commit**: YES (groups with Wave 2)
  - Message: `feat(backend): register new routers and add chat lifecycle hooks`
  - Files: `backend/main.py`, `backend/services/order_service.py`


- [x] 8. Frontend Types + API Clients (Ratings, Chat, Stats)

  **What to do**:
  - In `mobile/src/types/index.ts`:
    - Add `Rating` interface: `id: string`, `order_id: string`, `rater_id: string`, `ratee_id: string`, `stars: number`, `feedback: string | null`, `created_at: string`
    - Add `ChatMessage` interface: `id: string`, `order_id: string`, `sender_id: string`, `sender_nickname: string`, `content: string`, `message_type: 'text' | 'system'`, `created_at: string`
    - Add `LeaderboardEntry` interface: `user_id: string`, `nickname: string`, `value: number`, `total_orders?: number`, `total_ratings?: number`
    - Add `LeaderboardResponse` interface: `top_orderers: LeaderboardEntry[]`, `top_deliverers: LeaderboardEntry[]`
    - Add screen params to `RootStackParamList`: `ChatScreen: { orderId: string }`, `MyOrders: undefined`
  - Create `mobile/src/api/ratings.ts`:
    - `submitRating(orderId: string, stars: number, feedback?: string): Promise<Rating>`
    - `getOrderRatings(orderId: string): Promise<Rating[]>`
  - Create `mobile/src/api/chat.ts`:
    - `sendMessage(orderId: string, content: string): Promise<ChatMessage>`
    - `getMessages(orderId: string, since?: string): Promise<ChatMessage[]>`
  - Create `mobile/src/api/stats.ts`:
    - `getLeaderboard(): Promise<LeaderboardResponse>`
  - All API functions follow pattern from `mobile/src/api/orders.ts`: use `client.get/post`, typed Promise return

  **Must NOT do**:
  - Do NOT use `any` types
  - Do NOT create separate type files — add to existing `types/index.ts`
  - Do NOT add WebSocket client code

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 9, 10, 11)
  - **Blocks**: Tasks 9, 10, 11, 14
  - **Blocked By**: Tasks 4, 5, 6 (needs backend endpoints to exist)

  **References**:

  **Pattern References**:
  - `mobile/src/api/orders.ts:1-52` — API client pattern: import client, typed async functions, destructure `{ data }`
  - `mobile/src/types/index.ts:1-83` — Current types file — add new interfaces following same style

  **API/Type References**:
  - `backend/schemas/rating.py` — RatingResponse shape (mirror in TS)
  - `backend/schemas/chat.py` — ChatMessageResponse shape (mirror in TS)
  - `backend/schemas/stats.py` — LeaderboardResponse shape (mirror in TS)

  **WHY Each Reference Matters**:
  - `orders.ts` API: Exact pattern to copy for all 3 new API files
  - `types/index.ts`: Must add types in same style, same file
  - Backend schemas: Source of truth for response shapes

  **Acceptance Criteria**:
  - [ ] `npx tsc --noEmit` passes from mobile/
  - [ ] All 3 API files exist with typed functions
  - [ ] RootStackParamList includes ChatScreen and MyOrders

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: TypeScript compilation passes with new types
    Tool: Bash
    Preconditions: All type and API files created
    Steps:
      1. Run `npx tsc --noEmit` from mobile/
      2. Assert exit code 0
    Expected Result: No type errors
    Evidence: .sisyphus/evidence/task-8-tsc.txt
  ```

  **Commit**: YES (groups with Wave 3)
  - Message: `feat(frontend): add rating, chat, and stats types and API clients`
  - Files: `mobile/src/types/index.ts`, `mobile/src/api/ratings.ts`, `mobile/src/api/chat.ts`, `mobile/src/api/stats.ts`

- [x] 9. MyOrdersScreen + Dashboard "My Orders" Card

  **What to do**:
  - Create `mobile/src/screens/MyOrdersScreen.tsx`:
    - Fetch user's orders using existing `getMyOrders()` from `api/orders.ts`
    - Display as FlatList of OrderCard components
    - Use `useFocusEffect` for data refresh on screen focus (pattern from DelivererQueueScreen)
    - Show empty state when no orders: "No orders yet"
    - Tapping an OrderCard navigates to OrderDetailScreen
    - Support dark mode (detect with `useColorScheme()`)
  - In `mobile/src/screens/DashboardScreen.tsx` (orderer mode):
    - Add a "My Orders" card below the existing "Order Food" card
    - Card shows order count or "View your orders" text
    - Tapping navigates to `MyOrders` screen
    - Style similar to existing "Order Food" card

  **Must NOT do**:
  - Do NOT add MyOrders to the deliverer view — orderer only
  - Do NOT use inline style objects — use StyleSheet.create()
  - Do NOT add pull-to-refresh (useFocusEffect is sufficient)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Screen layout, card design, dark mode, empty states

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 8, 10, 11)
  - **Blocks**: Task 12 (toast needs OrderDetail polling which builds on screen structure)
  - **Blocked By**: Task 8 (needs types + API), Task 2 (active order rule affects what orders are shown)

  **References**:

  **Pattern References**:
  - `mobile/src/screens/DelivererQueueScreen.tsx:1-132` — CRITICAL: Copy `useFocusEffect` polling pattern (lines 39-43), FlatList with OrderCard, empty state
  - `mobile/src/screens/DashboardScreen.tsx:1-299` — Card layout pattern, orderer/deliverer mode toggle, styling
  - `mobile/src/components/OrderCard.tsx:1-161` — OrderCard component to reuse in FlatList

  **API/Type References**:
  - `mobile/src/api/orders.ts:19-22` — `getMyOrders()` function (already exists, never called)
  - `mobile/src/types/index.ts` — `Order` type, `RootStackParamList`

  **WHY Each Reference Matters**:
  - DelivererQueueScreen: Nearly identical screen — copy structure, swap data source
  - DashboardScreen: Must modify to add card — need to understand layout structure
  - OrderCard: Reuse for consistent look

  **Acceptance Criteria**:
  - [ ] MyOrdersScreen renders list of user's orders
  - [ ] Tapping order navigates to OrderDetailScreen
  - [ ] Empty state displayed when no orders
  - [ ] "My Orders" card visible on orderer Dashboard
  - [ ] `npx tsc --noEmit` passes

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: MyOrdersScreen type-checks and renders
    Tool: Bash
    Steps:
      1. Run `npx tsc --noEmit` from mobile/
      2. Assert exit code 0
    Expected Result: No type errors in MyOrdersScreen or DashboardScreen
    Evidence: .sisyphus/evidence/task-9-tsc.txt

  Scenario: Dashboard orderer view has My Orders card
    Tool: Bash (grep)
    Steps:
      1. Search DashboardScreen.tsx for 'My Orders' or 'MyOrders' text
      2. Assert presence of navigation to 'MyOrders' screen
    Expected Result: My Orders card exists with navigation handler
    Evidence: .sisyphus/evidence/task-9-dashboard-card.txt
  ```

  **Commit**: YES (groups with Wave 3)
  - Message: `feat(frontend): add MyOrdersScreen and My Orders dashboard card`
  - Files: `mobile/src/screens/MyOrdersScreen.tsx`, `mobile/src/screens/DashboardScreen.tsx`

- [x] 10. ChatScreen with Polling

  **What to do**:
  - Create `mobile/src/screens/ChatScreen.tsx`:
    - Receives `orderId` from navigation params
    - FlatList displaying chat messages, newest at bottom (`inverted={false}`, scroll to end on new messages)
    - Text input + send button at bottom (fixed position above keyboard)
    - Poll for new messages every 3 seconds using `setInterval` + `useEffect`:
      - Track `lastFetchedAt` timestamp
      - Call `getMessages(orderId, lastFetchedAt)` to get only new messages since last poll
      - Append new messages to state, update `lastFetchedAt`
    - System messages styled differently: centered, gray italic text, no sender name
    - User messages: left-aligned for other user, right-aligned for current user (bubble style)
    - Show sender nickname on received messages
    - Dark mode support using `useColorScheme()`
    - Clean up polling interval on unmount
    - Use `KeyboardAvoidingView` for iOS keyboard handling

  **Must NOT do**:
  - Do NOT use WebSocket — HTTP polling only
  - Do NOT add read receipts or typing indicators
  - Do NOT use any third-party chat UI library
  - Do NOT use inline style objects

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Chat bubble layout, keyboard handling, dark mode styling

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 8, 9, 11)
  - **Blocks**: None
  - **Blocked By**: Task 5 (needs chat API), Task 8 (needs ChatMessage type + API client)

  **References**:

  **Pattern References**:
  - `mobile/src/screens/DelivererQueueScreen.tsx:39-43` — `useFocusEffect` + polling pattern (adapt for `setInterval`)
  - `mobile/src/screens/OrderDetailScreen.tsx:1-472` — Screen with useEffect, dark mode, StyleSheet at bottom

  **API/Type References**:
  - `mobile/src/api/chat.ts` — `sendMessage()`, `getMessages()` (Task 8)
  - `mobile/src/types/index.ts` — `ChatMessage` type (Task 8)

  **External References**:
  - React Native FlatList: https://reactnative.dev/docs/flatlist
  - React Native KeyboardAvoidingView: https://reactnative.dev/docs/keyboardavoidingview

  **WHY Each Reference Matters**:
  - DelivererQueueScreen: Polling + FlatList pattern to adapt
  - Chat API: Exact functions to call for send/receive

  **Acceptance Criteria**:
  - [ ] ChatScreen renders with message list and text input
  - [ ] Messages display with sender nickname
  - [ ] System messages styled differently (centered, gray, italic)
  - [ ] User's own messages right-aligned, other's left-aligned
  - [ ] Polling fetches new messages every 3 seconds
  - [ ] `npx tsc --noEmit` passes

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: ChatScreen type-checks
    Tool: Bash
    Steps:
      1. Run `npx tsc --noEmit` from mobile/
      2. Assert exit code 0
    Expected Result: No type errors in ChatScreen
    Evidence: .sisyphus/evidence/task-10-tsc.txt

  Scenario: ChatScreen has polling logic
    Tool: Bash (grep)
    Steps:
      1. Search ChatScreen.tsx for 'setInterval' or 'useEffect'
      2. Search for 'getMessages' call
      3. Assert both present
    Expected Result: Polling mechanism implemented with getMessages
    Evidence: .sisyphus/evidence/task-10-polling.txt
  ```

  **Commit**: YES (groups with Wave 3)
  - Message: `feat(frontend): add ChatScreen with polling-based messaging`
  - Files: `mobile/src/screens/ChatScreen.tsx`

- [x] 11. Inline Rating UI on OrderDetailScreen

  **What to do**:
  - Create `mobile/src/components/StarRating.tsx`:
    - Props: `rating: number`, `onRate: (stars: number) => void`, `size?: number`, `disabled?: boolean`
    - Render 5 star icons using `Ionicons` from `@expo/vector-icons`:
      - Filled star (`star`) for rated, outline (`star-outline`) for unrated
      - Tappable — tapping star N sets rating to N
      - Gold color (#FFD700) for filled, gray for outline
    - Component is a simple row of TouchableOpacity-wrapped Ionicon stars
  - In `mobile/src/screens/OrderDetailScreen.tsx`:
    - When order status is "delivered", show an inline rating section below the timeline:
      - StarRating component pre-filled to 5 stars
      - Optional TextInput for feedback (placeholder: "Any feedback? (optional)")
      - "Submit Rating" button
      - On submit: call `submitRating(orderId, stars, feedback)`
      - After successful submit: show "Rating submitted!" text, disable the StarRating
      - If user has already rated (check via `getOrderRatings`), show the submitted rating as disabled
    - This is an inline row — NOT a popup/modal
    - Both orderer and deliverer see the rating section on delivered orders
    - Dark mode support

  **Must NOT do**:
  - Do NOT use a modal or popup for rating — inline only
  - Do NOT auto-submit — user must tap Submit
  - Do NOT use any third-party rating library
  - Do NOT use `any` types

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Star rating component, inline layout, disabled states

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 8, 9, 10)
  - **Blocks**: Task 13 (timeline enhancement builds on OrderDetailScreen changes)
  - **Blocked By**: Task 4 (needs rating API), Task 8 (needs Rating type + API client)

  **References**:

  **Pattern References**:
  - `mobile/src/screens/OrderDetailScreen.tsx:157-168` — `renderTimelineItem` — insert rating section BELOW the timeline
  - `mobile/src/screens/OrderDetailScreen.tsx:1-50` — Imports, state, useEffect pattern
  - `mobile/src/components/ChipSelector.tsx` — Custom interactive component pattern (TouchableOpacity row)

  **API/Type References**:
  - `mobile/src/api/ratings.ts` — `submitRating()`, `getOrderRatings()` (Task 8)
  - `mobile/src/types/index.ts` — `Rating` type (Task 8)

  **External References**:
  - Expo Ionicons: use `import { Ionicons } from '@expo/vector-icons'`
  - Star icons: `star` (filled) and `star-outline` (empty)

  **WHY Each Reference Matters**:
  - OrderDetailScreen timeline: Rating section goes directly below it
  - ChipSelector: Example of custom interactive component with TouchableOpacity
  - Rating API: Functions to call on submit

  **Acceptance Criteria**:
  - [ ] StarRating component renders 5 tappable stars
  - [ ] Default rating is 5 stars (pre-filled)
  - [ ] Tapping star changes rating value
  - [ ] Submit button calls API and shows confirmation
  - [ ] Already-rated orders show disabled rating
  - [ ] Rating section only visible when status is "delivered"
  - [ ] `npx tsc --noEmit` passes

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Rating UI type-checks
    Tool: Bash
    Steps:
      1. Run `npx tsc --noEmit` from mobile/
      2. Assert exit code 0
    Expected Result: No type errors in StarRating or OrderDetailScreen
    Evidence: .sisyphus/evidence/task-11-tsc.txt

  Scenario: StarRating component exists with correct props
    Tool: Bash (grep)
    Steps:
      1. Search StarRating.tsx for 'onRate' and 'rating' props
      2. Search for 'Ionicons' import
      3. Search OrderDetailScreen.tsx for 'StarRating' import
    Expected Result: StarRating has proper interface, uses Ionicons, imported in OrderDetail
    Evidence: .sisyphus/evidence/task-11-star-component.txt
  ```

  **Commit**: YES (groups with Wave 3)
  - Message: `feat(frontend): add inline star rating on OrderDetailScreen`
  - Files: `mobile/src/components/StarRating.tsx`, `mobile/src/screens/OrderDetailScreen.tsx`

- [ ] 12. Toast Notification System + OrderDetail Polling

  **What to do**:
  - Create `mobile/src/components/Toast.tsx`:
    - Animated banner that slides down from top of screen
    - Props: `message: string`, `type: 'success' | 'info' | 'warning'`, `visible: boolean`, `onHide: () => void`
    - Auto-dismiss after 3 seconds
    - Use `Animated.timing` for slide-in/out animation
    - Color-coded: success=green, info=blue, warning=orange
    - Positioned with `position: 'absolute'`, `top: 0`, `zIndex: 9999`
  - Create `mobile/src/context/ToastContext.tsx`:
    - `ToastProvider` wrapping app with state for current toast
    - `useToast()` hook returning `showToast(message, type)` function
    - Queue logic: if toast is showing and new one arrives, replace it
  - In `mobile/src/screens/OrderDetailScreen.tsx`:
    - Add polling with `setInterval` (15-second interval) when order is in non-terminal state (pending/accepted/picked_up):
      - Fetch order data from `getOrderDetail(orderId)` (already exists in api/orders.ts)
      - Compare new status with previous status
      - If status changed: call `showToast()` with appropriate message:
        - pending → accepted: "Your order has been accepted!"
        - accepted → picked_up: "Your food is being picked up!"
        - picked_up → delivered: "Your food has been delivered!"
        - any → cancelled: "Order has been cancelled"
      - Update local order state with new data
    - Stop polling when order reaches terminal state (delivered/cancelled)
    - Clean up interval on unmount

  **Must NOT do**:
  - Do NOT use push notifications (FCM, APNs) — in-app toast only
  - Do NOT use third-party toast/snackbar library
  - Do NOT poll more frequently than 15 seconds on OrderDetail
  - Do NOT show toast on initial load — only on STATUS CHANGE

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Animation, context provider, conditional rendering

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 13, 14, 15)
  - **Blocks**: None
  - **Blocked By**: Task 9 (screen structure must exist)

  **References**:

  **Pattern References**:
  - `mobile/src/screens/DashboardScreen.tsx:45-65` — `Animated.timing` usage pattern (fade animation)
  - `mobile/src/context/AuthContext.tsx:1-82` — Context + Provider + custom hook pattern
  - `mobile/src/screens/OrderDetailScreen.tsx:1-50` — Current useEffect and state management

  **API/Type References**:
  - `mobile/src/api/orders.ts:24-27` — `getOrderDetail()` for polling

  **WHY Each Reference Matters**:
  - DashboardScreen animation: Copy `Animated.timing` setup for toast slide animation
  - AuthContext: Same Provider + hook pattern for ToastContext
  - OrderDetailScreen: Must add polling logic to existing useEffect structure

  **Acceptance Criteria**:
  - [ ] Toast component slides in from top with animation
  - [ ] Toast auto-dismisses after 3 seconds
  - [ ] ToastContext provides `showToast()` function
  - [ ] OrderDetailScreen polls every 15s in non-terminal states
  - [ ] Toast shown on status change (not initial load)
  - [ ] Polling stops on terminal state
  - [ ] `npx tsc --noEmit` passes

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Toast and polling type-check
    Tool: Bash
    Steps:
      1. Run `npx tsc --noEmit` from mobile/
      2. Assert exit code 0
    Expected Result: No type errors in Toast, ToastContext, or OrderDetailScreen
    Evidence: .sisyphus/evidence/task-12-tsc.txt

  Scenario: Toast component has animation logic
    Tool: Bash (grep)
    Steps:
      1. Search Toast.tsx for 'Animated.timing' or 'Animated.spring'
      2. Search for 'position.*absolute'
    Expected Result: Animation and absolute positioning present
    Evidence: .sisyphus/evidence/task-12-toast-animation.txt
  ```

  **Commit**: YES (groups with Wave 4)
  - Message: `feat(frontend): add toast notifications and order status polling`
  - Files: `mobile/src/components/Toast.tsx`, `mobile/src/context/ToastContext.tsx`, `mobile/src/screens/OrderDetailScreen.tsx`

- [ ] 13. Animated Timeline Enhancement

  **What to do**:
  - In `mobile/src/screens/OrderDetailScreen.tsx`:
    - Enhance the existing `renderTimelineItem` (currently lines 157-168):
      - Add connecting VERTICAL LINES between timeline steps:
        - Line above each step (except first)
        - Green for completed steps, gray for upcoming
      - Add PULSE ANIMATION on the currently active step:
        - Use `Animated.loop(Animated.sequence([Animated.timing(...), Animated.timing(...)]))` to create a pulsing opacity effect on the active step's dot
        - Active step = the step matching current order status
      - Color progression:
        - Completed steps: green dot + green line + green text
        - Active step: green pulsing dot + bold text
        - Future steps: gray dot + gray line + gray text
      - Use `useRef` for Animated.Value to prevent re-initialization on re-render
    - Timeline steps remain: Pending → Accepted → Picked Up → Delivered
    - Keep existing layout structure — enhance, don't rewrite

  **Must NOT do**:
  - Do NOT use `react-native-reanimated` — built-in `Animated` API only
  - Do NOT rewrite the entire OrderDetailScreen — only enhance timeline section
  - Do NOT change timeline step labels or order

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Animation design, visual polish, color progression

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 12, 14, 15)
  - **Blocks**: None
  - **Blocked By**: Task 11 (rating UI modifies same file — must apply after)

  **References**:

  **Pattern References**:
  - `mobile/src/screens/OrderDetailScreen.tsx:157-168` — Current `renderTimelineItem` — THIS is what to enhance
  - `mobile/src/screens/DashboardScreen.tsx:45-65` — `Animated.timing` pattern already used in the app

  **External References**:
  - React Native Animated API: https://reactnative.dev/docs/animated
  - `Animated.loop` + `Animated.sequence` for pulse: https://reactnative.dev/docs/animated#loop

  **WHY Each Reference Matters**:
  - renderTimelineItem: The exact code to enhance — keep structure, add lines + animation
  - DashboardScreen animation: Proven Animated.timing pattern in same codebase

  **Acceptance Criteria**:
  - [ ] Vertical connecting lines visible between timeline steps
  - [ ] Completed steps show green color
  - [ ] Active step has pulse animation
  - [ ] Future steps show gray color
  - [ ] Animation uses built-in `Animated` API (not Reanimated)
  - [ ] `npx tsc --noEmit` passes

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Timeline animation type-checks
    Tool: Bash
    Steps:
      1. Run `npx tsc --noEmit` from mobile/
      2. Assert exit code 0
    Expected Result: No type errors
    Evidence: .sisyphus/evidence/task-13-tsc.txt

  Scenario: Timeline has animation and connecting lines
    Tool: Bash (grep)
    Steps:
      1. Search OrderDetailScreen.tsx for 'Animated.loop' or 'Animated.sequence'
      2. Search for 'borderLeftWidth' or 'height.*2' (connecting line styles)
    Expected Result: Animation loop and connecting line styles present
    Evidence: .sisyphus/evidence/task-13-animation.txt
  ```

  **Commit**: YES (groups with Wave 4)
  - Message: `feat(frontend): add animated timeline with connecting lines and pulse effect`
  - Files: `mobile/src/screens/OrderDetailScreen.tsx`

- [ ] 14. Stats Cards on Dashboard

  **What to do**:
  - In `mobile/src/screens/DashboardScreen.tsx`:
    - Add a "Leaderboard" section below the existing cards
    - Fetch data from `getLeaderboard()` on mount/focus
    - Display two cards:
      - "Top Orderers" — list of top 5 nicknames + order count
      - "Top Deliverers" — list of top 5 nicknames + average rating (show as stars or numeric)
    - Each entry: rank number + nickname + value
    - Style: compact cards with numbered list, matching existing Dashboard card style
    - Show "No data yet" in cards when arrays are empty
    - Dark mode support

  **Must NOT do**:
  - Do NOT build a separate leaderboard screen — inline on Dashboard
  - Do NOT add pull-to-refresh — `useFocusEffect` is sufficient
  - Do NOT show user emails or IDs — only nicknames

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Card layout, numbered list styling, dark mode

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 12, 13, 15)
  - **Blocks**: None
  - **Blocked By**: Task 6 (needs stats API), Task 8 (needs LeaderboardResponse type + API client)

  **References**:

  **Pattern References**:
  - `mobile/src/screens/DashboardScreen.tsx:120-180` — Existing card layout and styling to match
  - `mobile/src/screens/DelivererQueueScreen.tsx:39-43` — `useFocusEffect` for data fetch

  **API/Type References**:
  - `mobile/src/api/stats.ts` — `getLeaderboard()` (Task 8)
  - `mobile/src/types/index.ts` — `LeaderboardResponse`, `LeaderboardEntry` (Task 8)

  **WHY Each Reference Matters**:
  - DashboardScreen cards: Match existing visual style exactly
  - Stats API: Data source for leaderboard content

  **Acceptance Criteria**:
  - [ ] Two leaderboard cards visible on Dashboard
  - [ ] Top orderers show nickname + order count
  - [ ] Top deliverers show nickname + average rating
  - [ ] Empty state shows "No data yet"
  - [ ] `npx tsc --noEmit` passes

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Dashboard stats cards type-check
    Tool: Bash
    Steps:
      1. Run `npx tsc --noEmit` from mobile/
      2. Assert exit code 0
    Expected Result: No type errors in DashboardScreen
    Evidence: .sisyphus/evidence/task-14-tsc.txt

  Scenario: Leaderboard cards in Dashboard
    Tool: Bash (grep)
    Steps:
      1. Search DashboardScreen.tsx for 'getLeaderboard' or 'Leaderboard'
      2. Search for 'Top Orderers' or 'Top Deliverers'
    Expected Result: Leaderboard fetch and display logic present
    Evidence: .sisyphus/evidence/task-14-leaderboard-cards.txt
  ```

  **Commit**: YES (groups with Wave 4)
  - Message: `feat(frontend): add leaderboard stats cards to Dashboard`
  - Files: `mobile/src/screens/DashboardScreen.tsx`

- [x] 15. Navigation Registration + Final Wiring

  **What to do**:
  - In `mobile/src/navigation/RootNavigator.tsx`:
    - Import `ChatScreen` and `MyOrdersScreen`
    - Add `<Stack.Screen name="ChatScreen" component={ChatScreen} options={{ title: 'Chat' }} />`
    - Add `<Stack.Screen name="MyOrders" component={MyOrdersScreen} options={{ title: 'My Orders' }} />`
  - In `mobile/App.tsx`:
    - Import `ToastProvider` from `context/ToastContext`
    - Wrap existing content with `<ToastProvider>...</ToastProvider>` (inside AuthProvider, outside NavigationContainer or around it)
  - In `mobile/src/screens/OrderDetailScreen.tsx`:
    - Add a "Chat" button (visible when order is accepted/picked_up AND order has a deliverer):
      - Navigate to ChatScreen with `{ orderId: order.id }`
      - Button style: secondary button or icon button
    - Add a "Chat" button for deliverer view as well (same conditions)

  **Must NOT do**:
  - Do NOT modify any other navigation routes
  - Do NOT add navigation to screens that don't exist yet
  - Do NOT change existing screen options

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []
    - Simple import + registration + button addition

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4 (runs LAST — depends on all Wave 3 + Wave 4 screens)
  - **Blocks**: F1-F4 (final verification)
  - **Blocked By**: Tasks 8-14 (all screens and components must exist)

  **References**:

  **Pattern References**:
  - `mobile/src/navigation/RootNavigator.tsx:1-53` — Current navigation setup — add new screens same way
  - `mobile/App.tsx` — Current provider wrapping — add ToastProvider
  - `mobile/src/screens/OrderDetailScreen.tsx:200-250` — Button area for adding Chat button

  **API/Type References**:
  - `mobile/src/types/index.ts` — `RootStackParamList` with ChatScreen and MyOrders (Task 8)

  **WHY Each Reference Matters**:
  - RootNavigator: Must add screens in the same pattern as existing ones
  - App.tsx: Must wrap correctly without breaking existing provider chain
  - OrderDetailScreen: Must add Chat button in the right location

  **Acceptance Criteria**:
  - [ ] ChatScreen and MyOrders registered in navigator
  - [ ] ToastProvider wraps app
  - [ ] Chat button visible on OrderDetailScreen for accepted/picked_up orders
  - [ ] Chat button navigates to ChatScreen with correct orderId
  - [ ] `npx tsc --noEmit` passes
  - [ ] App builds and runs without navigation errors

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Full frontend type-check
    Tool: Bash
    Steps:
      1. Run `npx tsc --noEmit` from mobile/
      2. Assert exit code 0
    Expected Result: Zero type errors across entire frontend
    Evidence: .sisyphus/evidence/task-15-tsc.txt

  Scenario: Navigation and wiring complete
    Tool: Bash (grep)
    Steps:
      1. Search RootNavigator.tsx for 'ChatScreen' and 'MyOrders'
      2. Search App.tsx for 'ToastProvider'
      3. Search OrderDetailScreen.tsx for 'ChatScreen' navigation
    Expected Result: All registrations and wiring present
    Evidence: .sisyphus/evidence/task-15-wiring.txt
  ```

  **Commit**: YES (groups with Wave 4)
  - Message: `feat(frontend): register new screens, add ToastProvider, wire chat button`
  - Files: `mobile/src/navigation/RootNavigator.tsx`, `mobile/App.tsx`, `mobile/src/screens/OrderDetailScreen.tsx`
---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Rejection → fix → re-run.

- [x] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, curl endpoint, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in `.sisyphus/evidence/`. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [x] F2. **Code Quality Review** — `unspecified-high`
  Run `npx tsc --noEmit` from `mobile/`. Review all changed/new files for: `as any`/`@ts-ignore`, empty catches, `console.log` in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names (data/result/item/temp). Verify Python files use `str | None` not `Optional[str]`. Check `from typing import List, Dict, Optional` is NOT used.
  Output: `TSC [PASS/FAIL] | Files [N clean/N issues] | VERDICT`

- [x] F3. **Real Manual QA** — `unspecified-high`
  Start backend with `uvicorn main:app --reload` from `backend/`. Run full lifecycle:
  1. Register user, login, get token
  2. Create order → verify only 1 active order allowed (second creation → 409)
  3. Accept order with different user → verify chat system messages created
  4. Send/receive chat messages via polling
  5. Pickup → Deliver → verify chat messages deleted
  6. Submit rating (5 stars) → verify rating stored
  7. Change rating to 3 stars → verify update
  8. Check leaderboard endpoint
  9. Run `npx tsc --noEmit` from `mobile/`
  Save all curl outputs to `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | VERDICT`

- [x] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual files created/modified. Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep). Check "Must NOT do" compliance. Detect cross-task contamination. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

- **Wave 1**: `feat(backend): add rating and chat models with schemas`
- **Wave 2**: `feat(backend): add rating, chat, and stats services and routers`
- **Wave 3**: `feat(frontend): add chat, my-orders, and rating screens`
- **Wave 4**: `feat(frontend): add toast notifications, animated timeline, and stats cards`
- **IMPORTANT**: Remember `git add -f backend/models/rating.py backend/models/message.py` due to `.gitignore` models/ rule

---

## Success Criteria

### Verification Commands
```bash
# Frontend type-check
cd mobile && npx tsc --noEmit  # Expected: exit code 0

# Backend health
curl http://localhost:8000/health  # Expected: {"status":"ok"}

# Active order enforcement
curl -s -X POST http://localhost:8000/orders -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '...'
# Expected: 201 first time, 409 second time

# Rating endpoints
curl -s http://localhost:8000/orders/{id}/ratings  # Expected: 200 with ratings array
curl -s -X POST http://localhost:8000/orders/{id}/rate -H "Authorization: Bearer $TOKEN" -d '{"stars":5}'  # Expected: 200

# Chat endpoints
curl -s http://localhost:8000/orders/{id}/chat  # Expected: 200 with messages array
curl -s -X POST http://localhost:8000/orders/{id}/chat -H "Authorization: Bearer $TOKEN" -d '{"content":"hello"}'  # Expected: 201

# Leaderboard
curl -s http://localhost:8000/stats/leaderboard  # Expected: 200 with top_orderers, top_deliverers
```

### Final Checklist
- [ ] All "Must Have" items present
- [ ] All "Must NOT Have" items absent
- [ ] `npx tsc --noEmit` passes
- [ ] Backend starts and all endpoints respond
- [ ] Full lifecycle: create → accept → chat → pickup → deliver → rate → stats
