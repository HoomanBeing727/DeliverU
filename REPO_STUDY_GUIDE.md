# DeliverU Repository Study Guide

This document is written as a re-learning guide for the entire repository. The goal is not just to list files, but to let you rebuild the project mentally: what the system is, how data moves, where each responsibility lives, how the backend and mobile app connect, and what implementation mistakes or technical debt became visible as the project grew.

I wrote this from the repository itself, not from assumptions. Where possible, I point to concrete file sections and function ranges so you can jump from the explanation to the implementation immediately.

---

## 1. The whole project in words first

At the highest level, this repository is a two-part application:

1. a **FastAPI backend** that owns authentication, business rules, persistence, and state transitions; and
2. a **React Native / Expo mobile app** that owns onboarding, navigation, UI state, and user interaction.

The project is a campus delivery marketplace with a constrained domain:

- every user is a student account,
- every order belongs to one orderer,
- a deliverer may accept and fulfill that order,
- credits are the internal currency,
- order states are explicit and finite,
- dorm hall matters because hall membership is used as an authorization boundary for group-order behavior.

The architecture is simple in spirit:

```text
Mobile screen
  -> mobile API wrapper
    -> Axios client with Bearer token
      -> FastAPI router
        -> service function
          -> SQLAlchemy ORM model(s)
            -> PostgreSQL
        <- response schema / manual response assembly
      <- typed JSON
  <- screen state update / navigation
```

What makes the repo interesting is that it is **not** just CRUD. It has a small but real workflow engine inside it:

- auth gating,
- profile completion gating,
- order state transitions,
- credit deduction / refund / reward,
- hall-based visibility rules,
- group order join approval workflow,
- chat availability only in certain states,
- rating only after delivery.

So the real architecture is not “frontend + backend.” It is:

```text
Identity system
Profile system
Order state machine
Credit ledger
Chat subsystem
Ratings subsystem
Group order workflow
Leaderboard/statistics read models
```

All of those are coupled around the `User` and `Order` models.

---

## 2. Mental map of the repository

You can understand the repo as four major zones.

### Zone A — Backend runtime and infrastructure

- `backend/main.py` — app boot, CORS, router registration, startup table creation
- `backend/database.py` — engine, sessionmaker, base model class, DB dependency
- `backend/config.py` — environment configuration

This zone answers: **How does the backend start, and how do requests get a database session?**

### Zone B — Backend domain logic

- `backend/models/` — database truth
- `backend/schemas/` — input/output contracts
- `backend/services/` — business rules and state transitions
- `backend/routers/` — HTTP endpoints and response assembly
- `backend/middleware/auth_middleware.py` — current-user resolution from JWT

This zone answers: **What does the system do?**

### Zone C — Mobile application shell

- `mobile/App.tsx` — root provider composition
- `mobile/src/context/AuthContext.tsx` — token + current user lifecycle
- `mobile/src/navigation/RootNavigator.tsx` — stack gating by auth/profile
- `mobile/src/navigation/TabNavigator.tsx` — tab shell for logged-in experience

This zone answers: **How does the app decide what the user is allowed to see?**

### Zone D — Mobile feature implementation

- `mobile/src/api/` — typed HTTP wrappers
- `mobile/src/screens/` — user-facing flows
- `mobile/src/components/` — reusable UI pieces
- `mobile/src/constants/` — theme, dorm constants
- `mobile/src/types/index.ts` — frontend domain shape definitions

This zone answers: **How does the app represent backend data and turn it into interactions?**

---

## 3. Startup architecture: how the system comes alive

### Backend startup

The backend starts from `backend/main.py`.

Important sections:

- `backend/main.py:12-17` — lifespan startup hook
- `backend/main.py:20-37` — app creation, CORS, router inclusion
- `backend/main.py:40-42` — health check endpoint

The most important architectural choice here is that tables are created automatically on startup:

```python
@asynccontextmanager
async def lifespan(app):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
```

That means the project intentionally avoids migrations and treats the ORM metadata as the schema source. This is fast for development, but it also means schema evolution is fragile. You gain convenience, but you lose migration history and safe incremental schema changes.

### Database bootstrapping

See `backend/database.py:7-19`.

Core structure:

```python
engine = create_async_engine(settings.database_url, echo=False)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

class Base(DeclarativeBase):
    pass

async def get_db():
    async with async_session() as session:
        yield session
```

This file defines three important rules for the entire backend:

1. all DB access is async,
2. all models inherit from one shared `Base`,
3. request handlers receive a session through FastAPI dependency injection.

### Configuration bootstrapping

See `backend/config.py:4-15`.

This is intentionally thin. The system only cares about:

- `database_url`
- `jwt_secret`
- `jwt_algorithm`
- `jwt_expiry_hours`

This is a good sign in one sense: the project stayed small enough that config sprawl did not take over. It is also a sign that infra concerns are still minimal and mostly local-dev oriented.

### Mobile startup

The mobile app starts in `mobile/App.tsx:9-20`.

Provider stack:

```tsx
<AuthProvider>
  <SafeAreaProvider>
    <ToastProvider>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </ToastProvider>
  </SafeAreaProvider>
</AuthProvider>
```

This tells you the real top-level mobile architecture:

- auth state exists above navigation,
- toast feedback is globally available,
- navigation decisions depend on auth state,
- safe area handling is part of the application shell, not individual screens.

---

## 4. The backend architecture in depth

## 4.1 Backend layering model

The backend uses a layered pattern, but not in a strict enterprise sense.

Actual layering is closer to this:

```text
Router
  - owns HTTP shape
  - owns Depends(get_current_user)
  - owns Depends(get_db)
  - often commits and refreshes
  - sometimes manually assembles response objects

Service
  - owns business rules
  - queries and mutates ORM objects
  - raises HTTPException directly
  - sometimes commits itself (important inconsistency)

Model
  - owns persistence fields only

Schema
  - owns validation and response contracts
```

This is a practical small-project architecture, not a pure one. The project values shipping over doctrinal separation.

---

## 4.2 Authentication and current-user resolution

### Auth service

See `backend/services/auth_service.py:9-34`.

Key responsibilities:

- `hash_password` — `9-12`
- `verify_password` — `14-16`
- `create_access_token` — `19-23`
- `decode_access_token` — `26-34`

Pseudocode:

```python
def create_access_token(user_id):
    expire = now_utc + expiry_hours
    payload = {"sub": user_id, "exp": expire}
    return jwt.encode(payload, secret, algorithm)

def decode_access_token(token):
    try:
        payload = jwt.decode(token, secret, algorithms=[algorithm])
        return payload.get("sub")
    except JWTError:
        return None
```

This is a classic JWT auth implementation. Very small, very readable, and easy to study.

### Auth router

See `backend/routers/auth.py:15-38` for register and `41-54` for login.

Registration flow:

```python
if email already exists:
    raise 409

user = User(email, hashed_password)
db.add(user)
await db.flush()
await grant_initial_credits(db, user)
await db.commit()
await db.refresh(user)

token = create_access_token(user.id)
return TokenResponse(access_token=token)
```

Interesting detail: initial credits are granted through the credit service, but `User.credits` already defaults to 100 in the model. So `grant_initial_credits` does not increase credits; it records the initial ledger entry. That means the true source of the initial number is split across two places:

- `backend/models/user.py:38-40` — default balance state
- `backend/services/credit_service.py:47-54` — initial ledger record

That is conceptually valid, but it is easy to forget. A future maintainer could change one and forget the other.

### Auth middleware

See `backend/middleware/auth_middleware.py:10-33`.

This is the gatekeeper for almost every authenticated route.

Pseudocode:

```python
async def get_current_user(creds=Depends(HTTPBearer()), db=Depends(get_db)):
    user_id = decode_access_token(creds.credentials)
    if user_id is None:
        raise 401

    user = select User where User.id == user_id
    if user is None:
        raise 401

    return user
```

This function is one of the most important “connective tissue” pieces in the backend because it turns a bare HTTP token into a fully loaded `User` ORM object.

---

## 4.3 Core data models

### User model

See `backend/models/user.py:9-42`.

The `User` model is not just identity. It is identity + preference profile + reputation + role configuration.

Fields naturally group into these clusters:

**Identity**
- `id`
- `email`
- `hashed_password`

**Orderer profile**
- `nickname`
- `dorm_hall`
- `order_times`
- `pref_take_order_location`
- `pref_delivery_habit`

**Deliverer profile**
- `is_deliverer`
- `available_return_times`
- `preferred_delivery_halls`

**System state**
- `dark_mode`
- `credits`
- `profile_completed`
- `average_rating`
- `total_ratings`

That means the project chose a **single user table** instead of a separate profile table or separate orderer/deliverer entities. For a student app, that is the correct complexity level.

### Order model

See `backend/models/order.py:10-56`.

This is the main domain object of the system.

The order model combines:

- ownership (`orderer_id`)
- assignment (`deliverer_id`)
- workflow (`status` + timestamps)
- order payload (`canteen`, `items`, `total_price`)
- delivery payload (`delivery_hall`, `delivery_preference`, `note`)
- QR handoff data (`qr_code_image`, `qr_code_data`)
- group-order linkage (`group_order_id`, `is_group_open`)

The most important insight is that **group orders are not a separate model**. They are represented by ordinary orders with extra flags and self-referencing linkage.

So architecturally:

```text
single order:       group_order_id = null, is_group_open = false
group root order:   group_order_id = null, is_group_open = true/false
group child order:  group_order_id = root_order.id, is_group_open = false
```

That is elegant because it avoids a second aggregate root. It is also why group-order logic becomes dense in the service layer.

### Ledger / auxiliary models

These supporting models form the “cross-cutting subsystems”:

- `backend/models/credit_transaction.py:10-30` — immutable-ish credit ledger record
- `backend/models/message.py:10-32` — chat messages
- `backend/models/rating.py:10-33` — post-delivery ratings
- `backend/models/group_order_join_request.py:10-43` — approval workflow for late joiners

The join-request model is especially important because it captures a design evolution: the project started with simple join behavior, then later needed approval logic. Instead of deleting the old direct-join path, the repo now contains **both direct group join** and **request-to-join** behavior.

---

## 4.4 Schemas: the contract layer

The most important order schemas live in `backend/schemas/order.py`.

Key sections:

- `OrderItemSchema` — `14-20`
- `OrderCreateRequest` — `22-47`
- `OrderResponse` — `49-75`
- group request + group response schemas — `91-131`

Important architectural role of schemas in this repo:

1. they validate user-facing business inputs like halls and canteens,
2. they define the response shapes the mobile app relies on,
3. they act as the backend-mobile alignment layer.

Example validation logic:

```python
@field_validator("canteen")
def valid_canteen(v):
    if v not in VALID_CANTEENS:
        raise ValueError(...)

@field_validator("delivery_hall")
def valid_delivery_hall(v):
    if v not in VALID_HALLS:
        raise ValueError(...)
```

This is one reason the app stays coherent: domain constants are enforced centrally on the backend even if the frontend already tries to constrain the same inputs.

---

## 4.5 Credit subsystem

See `backend/services/credit_service.py:10-64`.

This service is small, but it represents an important design principle: **credits are not just a field; they are also a ledger**.

Functions:

- `get_balance` — `10-16`
- `deduct_credit` — `19-31`
- `add_credit` — `33-44`
- `grant_initial_credits` — `47-54`
- `get_history` — `57-64`

Pseudocode:

```python
async def deduct_credit(db, user, amount, reason, order_id=None):
    user.credits -= amount
    db.add(CreditTransaction(user_id=user.id, amount=-amount, reason=reason, order_id=order_id))

async def add_credit(db, user, amount, reason, order_id=None):
    user.credits += amount
    db.add(CreditTransaction(user_id=user.id, amount=amount, reason=reason, order_id=order_id))
```

The backend does not simply mutate a balance. It also records why the balance changed. That is a good domain decision.

The weakness is concurrency: there is no locking or transactional protection against race conditions if two operations try to spend the same credits at once.

---

## 4.6 Order subsystem: the true core of the backend

The single most important file in the repo is `backend/services/order_service.py`.

This file is the system’s workflow engine.

### 4.6.1 Single-order flow

Key functions:

- `create_order` — `26-73`
- `get_user_orders` — `76-83`
- `get_deliverer_orders` — `86-94`
- `get_deliverer_queue` — `97-106`
- `accept_order` — `109-157`
- `pickup_order` — `160-182`
- `deliver_order` — `185-214`
- `cancel_order` — `217-246`

#### Create order

Pseudocode based on `26-73`:

```python
if user already has active order:
    raise 409

if user.credits < 1:
    raise 402

order = Order(
    orderer_id=user.id,
    canteen=canteen,
    items=items,
    total_price=total_price,
    delivery_hall=delivery_hall,
    delivery_preference=user.pref_delivery_habit or "hand_to_hand",
    note=note,
    qr_code_image=qr_code_image,
    qr_code_data=qr_code_data,
)

db.add(order)
await db.flush()
await deduct_credit(db, user, 1, "order_placed", order.id)
return order
```

This function shows the project’s operating model clearly: **an order costs one credit to create, regardless of food price**. Food price is informational; credits pay for the delivery service.

#### Accept order

Pseudocode based on `109-157`:

```python
load order
ensure it exists
ensure status == pending
ensure deliverer is not the orderer

order.status = "accepted"
order.deliverer_id = user.id
order.accepted_at = now

create system message: order accepted
load orderer user
create system message: preference summary
if hall access conflict:
    create system message: conflict warning

return order
```

This is a nice example of the backend doing more than status mutation. Accepting an order also activates the communication context around it.

#### Deliver order

Based on `185-214`:

```python
ensure assigned deliverer is making the call
ensure status == picked_up

order.status = "delivered"
order.delivered_at = now
delete_chat(order_id)
add_credit(deliverer, +1, "delivery_completed", order.id)
return order
```

This is the moment where the order workflow, chat subsystem, and credit ledger all intersect.

### 4.6.2 Group-order flow

Important group-order functions:

- `get_hall_open_group_orders` — `249-262`
- `get_group_participants` — `265-272`
- `count_group_participants` — `275-282`
- `join_group_order` — `285-362`
- `create_group_join_request` — `365-477`
- `list_group_join_requests` — `480-507`
- `approve_group_join_request` — `510-610`
- `reject_group_join_request` — `613-656`
- `cancel_group_join_request` — `659-688`
- `close_group_order` — `691-726`
- `accept_group_order` — `729-761`
- `pickup_group_order` — `764-803`
- `deliver_group_order` — `806-838`

The design here is subtle.

There are **two different join modes**:

1. **direct join** via `join_group_order` when a group order is still pending,
2. **join request / approval flow** via `create_group_join_request` and `approve_group_join_request` once the group already has a deliverer and is in `accepted` state.

That means group orders have an internal lifecycle of their own:

```text
pending + open
  -> people may join directly
  -> a deliverer may accept the whole batch

accepted + open
  -> people can no longer directly join
  -> they submit join requests
  -> deliverer approves or rejects

picked_up
  -> group closes automatically
  -> pending requests are rejected

delivered
  -> all child orders become delivered
  -> deliverer gets one credit per fulfilled order in the batch
```

#### Direct group join

From `285-362`:

```python
load root order
ensure user has dorm hall
ensure root delivery_hall == user.dorm_hall
ensure root is open
ensure root.status == pending
ensure user is not root owner
ensure user has not already joined
ensure user has credits

child = Order(
    orderer_id=user.id,
    canteen=root.canteen,
    items=[],
    total_price=0,
    delivery_hall=root.delivery_hall,
    delivery_preference=user.pref_delivery_habit or "hand_to_hand",
    note=note,
    group_order_id=root_order_id,
)

flush child
deduct 1 credit
return child
```

Architecturally this is clever: child orders are still normal orders, so downstream processing can reuse the same order model.

#### Approval-based join

The request model adds an extra staging layer:

```text
requester -> creates request
deliverer -> approves request
backend -> creates accepted child order + deducts requester credit
```

The most revealing function is `approve_group_join_request` (`510-610`). It does three things in one transaction boundary:

1. validates the request and roles,
2. materializes a real child order already in `accepted` state,
3. deducts a credit and marks the request as approved.

That means the join request is not the group membership. It is merely the approval envelope around the creation of the real child order.

#### Batch transitions

`accept_group_order`, `pickup_group_order`, and `deliver_group_order` do not invent a separate group state machine. They simply loop over the root + child orders and mutate each eligible order.

Pseudocode:

```python
participants = get_group_participants(root_order_id)
all_orders = [root] + participants

for order in all_orders:
    if order.status == expected_previous_state:
        order.status = next_state
        order.timestamp = now
```

This keeps the data model simple, but it also means the group aggregate is only implicit. There is no dedicated object enforcing consistency at a higher level than “loop over all related orders.”

---

## 4.7 Orders router: the HTTP surface of the business model

The router layer for orders is in `backend/routers/orders.py`, and it is one of the best files to study if you want to understand how the full system is wired.

Important sections:

- response helpers — `58-100`
- create order — `103-125`
- list my orders — `128-138`
- deliverer queue — `141-151`
- my deliveries — `154-164`
- hall-open group orders — `167-190`
- group order detail — `193-289`
- direct join — `292-307`
- close group — `310-320`
- join requests endpoints — `323-486`
- group accept/pickup/deliver — `489-556`
- order detail — `559-598`
- single-order accept/pickup/deliver/cancel — `601-650`

### Response assembly

`_order_to_response` and `_get_order_response` are key helpers.

The router does not rely entirely on ORM relationships; instead it manually loads orderer and deliverer users and constructs `OrderResponse` objects. That keeps the response shape explicit, but it also creates repeated query work.

### Important authorization behavior

`get_order_detail` (`559-598`) contains a subtle policy:

- any authenticated user may view **pending** orders,
- non-pending orders are restricted to the orderer or assigned deliverer,
- QR data is redacted for non-participants.

Pseudocode:

```python
if not is_orderer and not is_deliverer and order.status != "pending":
    raise 403

response = full_order_response(order)

if viewer is not orderer and not deliverer:
    response.qr_code_image = None
    response.qr_code_data = None
```

This makes sense for marketplace browsing, but it is also a broad visibility policy. It is worth remembering if privacy expectations increase later.

### Hall restriction as a first-class authorization rule

Group routes repeatedly enforce hall logic. This is not a UI convenience; it is backend authorization.

Examples:

- `167-190` — only see hall-open groups from your own hall
- `193-289` — group detail access depends on hall or participation role
- `489-518` — accepting a pending group order as deliverer requires matching hall

This is one of the clearest domain-specific rules in the whole repo.

---

## 4.8 Chat subsystem

Chat lives in two places:

- transport: `backend/routers/chat.py:17-76`
- behavior: `backend/services/chat_service.py:11-144`

This subsystem has strong state restrictions.

Chat is only allowed when the order is in `accepted` or `picked_up` state, and only participants can send/read messages.

Pseudocode from the service layer:

```python
load order
ensure order exists
ensure order.status in ("accepted", "picked_up")
ensure sender/requester is orderer or deliverer
```

The chat subsystem also supports system messages, which are created when important workflow events happen.

This is a good architectural decision because it turns chat into part of the operational workflow instead of a completely separate feature.

---

## 4.9 Rating subsystem

See `backend/services/rating_service.py:10-89`.

This subsystem is compact and clean.

Rules enforced:

- order must exist,
- order must be delivered,
- rater must be a participant,
- rating is effectively upserted by `(order_id, rater_id)` behavior,
- ratee stats are recalculated after submission.

Pseudocode:

```python
load order
ensure delivered
ensure rater is orderer or deliverer

ratee_id = deliverer if rater is orderer else orderer

if rating already exists for (order_id, rater_id):
    update it
else:
    create it

recompute ratee.average_rating and ratee.total_ratings
```

This is a good example of keeping derived data (`average_rating`, `total_ratings`) on the user model for fast reads while recalculating it centrally in one service.

---

## 5. The mobile architecture in depth

## 5.1 Mobile app shell

The mobile shell is built around three questions:

1. Do we have a token?
2. Do we have a completed profile?
3. Which major app section should the user see?

### AuthContext

See `mobile/src/context/AuthContext.tsx:20-74` and `76-82`.

This file does four jobs:

- persists the JWT in `AsyncStorage`,
- fetches the current profile after login/register/app restart,
- exposes `login`, `register`, `logout`, `refreshUser`,
- provides the top-level `token`, `user`, and `isLoading` state.

Startup pseudocode:

```tsx
useEffect(() => {
  const stored = await AsyncStorage.getItem('access_token')
  if (stored) {
    setToken(stored)
    const profile = await getProfile()
    setUser(profile)
  }
  setIsLoading(false)
})
```

This is the single most important frontend state file because the rest of the app is downstream of it.

### RootNavigator

See `mobile/src/navigation/RootNavigator.tsx:28-69`.

The gating logic is very clear:

```tsx
if (isLoading) show spinner
else if (!token) show Login/Register
else if (!user?.profile_completed) show ProfileSetup
else show full application stack
```

That makes the app easy to reason about. The navigation tree is acting as a state machine for user readiness.

### TabNavigator

See `mobile/src/navigation/TabNavigator.tsx:15-75`.

The main logged-in shell is four tabs:

- Home
- Orders
- Deliver
- Profile

This tells you the product’s real usage model:

- browsing / quick actions,
- managing your orderer side,
- managing your deliverer side,
- managing yourself.

---

## 5.2 Mobile API layer

The frontend API layer is intentionally thin.

### Shared Axios client

See `mobile/src/api/client.ts:11-49`.

Important behavior:

- auto-detect Expo host and derive backend URL,
- allow env override,
- fallback to localhost,
- attach Bearer token from `AsyncStorage` in a request interceptor.

Pseudocode:

```tsx
const baseURL = envBaseUrl || autoDetectedURL || 'http://localhost:8000'

client.interceptors.request.use(async config => {
  const token = await AsyncStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})
```

This is a good place to study because it explains why the rest of the mobile app can stay simple.

### Feature-specific API files

Important files:

- `mobile/src/api/auth.ts:8-15`
- `mobile/src/api/users.ts:4-21`
- `mobile/src/api/orders.ts:15-57`
- `mobile/src/api/groupOrders.ts:4-89`

These files are almost all “transport wrappers,” which is good. They do not try to hold business logic. They simply map frontend intent to backend endpoints.

---

## 5.3 Shared frontend domain types

See `mobile/src/types/index.ts:1-160`.

This file is the frontend’s mental model of the backend.

It contains:

- `OrderStatus` — `1`
- `OrderItem` — `3-7`
- `Order` — `9-32`
- `GroupOrderResponse` — `34-41`
- `GroupOrderJoinRequest` — `45-56`
- `CreditTransaction` — `58-65`
- `UserProfile` — `67-81`
- `Rating` — `93-101`
- `ChatMessage` — `103-111`
- navigation param lists — `126-160`

If you only read one frontend type file before reading screens, read this one. It tells you what the screens think the backend looks like.

---

## 5.4 Dashboard and Home: product shell vs duplicated shell

Two screens reveal an important implementation history:

- `mobile/src/screens/DashboardScreen.tsx`
- `mobile/src/screens/HomeScreen.tsx`

They are similar enough that they almost certainly represent design evolution rather than intentionally separate feature concepts.

### DashboardScreen

Important sections:

- state and mode toggles — `33-111`
- orderer / deliverer card navigation — `120-321`
- leaderboard — `324-383`
- settings — `386-425`

This screen is feature-rich. It includes:

- greeting + hall display,
- credit display,
- orderer/deliverer toggle,
- entry points to order flow,
- group order access,
- leaderboard snapshot,
- settings and sign-out.

### HomeScreen

Important section read: `33-255`.

It has overlapping responsibilities with `DashboardScreen`:

- greeting,
- hall display,
- credit display,
- orderer/deliverer toggle,
- orderer quick actions,
- active delivery count.

This is one of the clearest signs of frontend duplication in the repo. It is not necessarily wrong for a student project, but it is worth naming because it raises maintenance cost and encourages small behavior drift over time.

---

## 5.5 OrderDetailScreen: the richest mobile screen

See `mobile/src/screens/OrderDetailScreen.tsx`.

This screen is effectively the mobile orchestration hub for a single order.

Important sections:

- initial load and polling — `67-132`
- action helpers — `134-189`
- status visuals / progress stepper — `207-329`
- rendered detail sections — `331-569`
- bottom action buttons — `573-625`

This screen combines many domains at once:

- order display,
- role-aware action rendering,
- QR visibility,
- progress visualization,
- chat access,
- group-order branching,
- rating submission,
- cancellation / acceptance / pickup / delivery actions.

Pseudocode:

```tsx
load order
if delivered:
  load ratings and find current user's rating

if order active:
  poll every 5s for status updates
  if status changed:
    show toast

render sections conditionally based on:
  - isOrderer
  - isDeliverer
  - order.status
  - order.group_order_id
  - order.is_group_open

render footer action buttons for next valid transition
```

This screen reflects the project’s maturity: instead of one action per page, the system brought all order-related behavior into a single detailed control surface.

---

## 5.6 GroupOrderDetailScreen: where group logic becomes visible to the user

See `mobile/src/screens/GroupOrderDetailScreen.tsx`.

Important sections:

- load and role-aware join request fetch — `51-76`
- action handlers — `84-137`
- role derivation — `147-150`
- participant and request rendering — `152-220`
- footer actions — `287-343`

This screen is a good case study in role-based UI.

Different users see different actions:

- owner may close a pending open group,
- non-owner non-deliverer may become the deliverer for a pending group,
- non-owner non-deliverer may request to join an accepted open group,
- deliverer may approve/reject requests,
- deliverer may batch-pickup or batch-deliver the whole group.

That means this screen is the frontend mirror of the backend’s implicit group aggregate.

---

## 6. End-to-end flows you should study in order

## 6.1 Flow A — Register, persist token, hydrate profile

**Backend path**

- `backend/routers/auth.py:15-54`
- `backend/services/auth_service.py:9-34`
- `backend/services/credit_service.py:47-54`

**Frontend path**

- `mobile/src/api/auth.ts:8-15`
- `mobile/src/context/AuthContext.tsx:25-67`
- `mobile/src/navigation/RootNavigator.tsx:29-69`

Pseudocode:

```text
RegisterScreen/LoginScreen
  -> auth API call
  -> receive JWT
  -> store access_token in AsyncStorage
  -> fetch /users/me
  -> put user into AuthContext
  -> RootNavigator decides next screen based on profile_completed
```

## 6.2 Flow B — Complete profile and unlock the app

**Backend path**

- `backend/routers/users.py:46-108`
- `backend/schemas/user.py:29-87`

**Frontend path**

- `mobile/src/api/users.ts:9-21`
- `mobile/src/context/AuthContext.tsx:64-67`
- `mobile/src/navigation/RootNavigator.tsx:46-65`

The main business meaning here is not “save profile.” It is “transition user from incomplete to usable.”

## 6.3 Flow C — Create a single order

**Backend path**

- `backend/routers/orders.py:103-125`
- `backend/services/order_service.py:26-73`

**Frontend path**

- `mobile/src/screens/DashboardScreen.tsx:185-276`
- `mobile/src/api/orders.ts:4-18`

Business meaning:

- enforce one active orderer order at a time,
- charge one credit,
- store QR data for later pickup verification context.

## 6.4 Flow D — Deliverer queue to delivery completion

**Backend path**

- queue: `backend/routers/orders.py:141-151`
- accept: `601-611`
- pickup: `614-624`
- deliver: `627-637`
- service logic: `109-214`

**Frontend path**

- `mobile/src/api/orders.ts:25-57`
- `mobile/src/screens/OrderDetailScreen.tsx:573-625`

Workflow meaning:

```text
pending -> accepted -> picked_up -> delivered
```

Each transition changes what UI, chat, and rewards are available.

## 6.5 Flow E — Group order lifecycle

**Backend path**

- list hall-open groups: `167-190`
- detail: `193-289`
- direct join: `292-307`
- request join: `323-486`
- batch transitions: `489-556`

**Service engine**

- `backend/services/order_service.py:249-838`

**Frontend path**

- `mobile/src/api/groupOrders.ts:4-89`
- `mobile/src/screens/GroupOrderDetailScreen.tsx:41-343`

This is the repo’s most complex domain flow.

## 6.6 Flow F — Chat becomes available only after assignment

**Backend path**

- `backend/services/chat_service.py:11-144`
- `backend/routers/chat.py:17-76`

**Frontend path**

- `mobile/src/screens/OrderDetailScreen.tsx:449-463`
- dedicated chat screen in `mobile/src/screens/ChatScreen.tsx` (not deeply read here, but part of the flow)

Meaning:

chat is not a standalone social feature; it is a status-gated operational channel.

## 6.7 Flow G — Rating after delivery

**Backend path**

- `backend/services/rating_service.py:10-89`

**Frontend path**

- `mobile/src/screens/OrderDetailScreen.tsx:170-189` and `502-569`

Meaning:

reputation is downstream of successful workflow completion.

---

## 7. The most important architectural patterns in this repo

### Pattern 1 — Manual response assembly instead of deep ORM relation modeling

The orders router repeatedly fetches users and builds `OrderResponse` objects manually. This keeps the response contract very explicit.

Good side:

- easy to understand response shape,
- minimal hidden ORM magic,
- easier for a student project to debug.

Cost:

- repeated queries,
- more code in routers,
- more places where response drift can happen.

### Pattern 2 — Services own business rules, but still know about HTTP

Services raise `HTTPException` directly. That means services are not framework-neutral domain logic; they are business logic already coupled to FastAPI semantics.

This is common in smaller FastAPI projects and totally understandable, but it is worth recognizing.

### Pattern 3 — State machine by convention, not by dedicated abstraction

There is no separate state machine object. The order lifecycle is enforced by if-statements in service functions.

That is simple and readable, but the rules are spread across multiple functions rather than centralized in a single explicit state-transition model.

### Pattern 4 — Group orders reuse the normal order model

This is one of the smartest parts of the design. Instead of inventing a whole second domain object for participant orders, the project uses self-linked `Order` records.

### Pattern 5 — Frontend navigation as readiness state machine

`RootNavigator` is not just routing. It is enforcing the user journey:

- anonymous,
- authenticated but incomplete,
- fully onboarded.

---

## 8. Mistakes, inconsistencies, and technical debt that are visible from the repo

This section is intentionally direct because you asked not just for architecture, but also for a way to study your mistakes.

## 8.1 Service-layer transaction inconsistency

This is the most important backend mistake visible in the repo.

The project knowledge says routers should commit and services should only mutate/flush. But the actual code is inconsistent.

Evidence:

- `backend/services/chat_service.py:55-56` — `send_message` commits and refreshes
- `backend/services/chat_service.py:131-132` — `create_system_message` commits and refreshes
- `backend/services/chat_service.py:143-144` — `delete_chat` commits

Why this matters:

- `order_service.accept_order` calls `create_system_message` multiple times (`132-155`), so partial effects can commit before the router-level commit.
- `deliver_order` and `cancel_order` call `delete_chat`, which also commits internally.

That means the supposed transaction boundary is no longer just the router. In practice, the workflow can partially commit in the middle of a service operation.

This is the clearest architectural inconsistency in the backend.

## 8.2 Pyright suppression in a core router

At the top of `backend/routers/orders.py:1-6`, there are multiple Pyright suppression directives, plus `typing.cast` usage in `8` and `69`.

This usually means the file grew faster than its type model stayed clean. It is understandable in a fast-moving student project, but it is still a signal: the order router became complex enough that type friction was bypassed instead of resolved.

## 8.3 Router/service responsibility drift

The repo mostly follows “router commits, service mutates,” but not uniformly.

This creates a maintenance risk because future changes are harder to reason about. A maintainer may assume “safe, no commit yet” while a called helper has already committed.

## 8.4 Deliverer toggle can desynchronize role and preferences

See `backend/routers/users.py:124-134`.

`toggle_deliverer` only flips `user.is_deliverer`. It does not validate or populate `available_return_times` or `preferred_delivery_halls`.

That means the system can create a user who is marked as a deliverer but does not have the deliverer preference data that profile setup originally required.

This is not necessarily fatal, but it is a real data-shape inconsistency.

## 8.5 DashboardScreen and HomeScreen duplication

The mobile app clearly contains overlapping shells:

- `DashboardScreen.tsx`
- `HomeScreen.tsx`

They duplicate greeting logic, mode toggling, delivery sentence logic, and orderer/deliverer state behavior.

This usually happens when a product changes direction mid-build. The mistake is not the duplication itself; the real mistake is letting both survive without a clear reason.

## 8.6 Empty or minimal catch blocks on the mobile side

Examples:

- `mobile/src/context/AuthContext.tsx:34-35` swallows startup profile-fetch failure and only removes the token
- several screens log errors or show generic alerts without preserving detail

This is common in mobile prototypes, but it makes debugging harder because error semantics get flattened into “failed” without enough context.

## 8.7 No migrations

The backend schema is auto-created through `Base.metadata.create_all` in `backend/main.py:12-17`.

This was almost certainly the right decision for speed early on. The mistake is not using it early; the future risk is staying on it once the schema becomes stable and important.

## 8.8 Pending order visibility is broad

`backend/routers/orders.py:573-598` allows any authenticated user to inspect pending orders, with QR redaction.

This may be intentional for marketplace browsing, but if privacy expectations change, this route will matter. The point is not that it is wrong; the point is that it is a deliberate policy decision hidden inside a detail endpoint.

## 8.9 Group-order logic is rich but spread out

The group-order system is clever, but complexity is distributed across:

- order model flags,
- join-request model,
- service-layer loops,
- router-level hall checks,
- mobile role-specific UI branches.

That is normal growth, but it means the feature’s complexity is structural now, not just line-count complexity.

---

## 9. What this project does well

To study mistakes well, you should also study what you got right.

### You kept the domain model understandable

Even with many features, the core nouns stayed stable:

- User
- Order
- CreditTransaction
- ChatMessage
- Rating
- GroupOrderJoinRequest

That is a good sign. The project did not explode into too many abstractions.

### You encoded real product rules in the backend

Important rules are actually enforced server-side:

- one active order at a time,
- must have credits to order/join,
- hall restriction for group orders,
- only participants can rate,
- chat only in valid states,
- only assigned deliverer can progress delivery.

That is the difference between a UI demo and a real application.

### You made the frontend reasonably type-aware

`mobile/src/types/index.ts` is a strong spine for the app. The mobile code mostly talks to the backend through typed API functions instead of ad-hoc fetches.

### You kept feature discoverability high

The navigation and dashboard structure make the product easy to demo and easy to explore.

---

## 10. Recommended reading order for re-studying the project from scratch

If you want to study this repo efficiently, do it in this order.

### Pass 1 — Understand system shape

1. `backend/main.py:12-42`
2. `backend/database.py:7-19`
3. `backend/config.py:4-15`
4. `mobile/App.tsx:9-20`
5. `mobile/src/navigation/RootNavigator.tsx:28-69`
6. `mobile/src/types/index.ts:1-160`

After this pass, you should understand the shell, not the features.

### Pass 2 — Understand identity and onboarding

1. `backend/services/auth_service.py:9-34`
2. `backend/routers/auth.py:15-54`
3. `backend/schemas/user.py:29-87`
4. `backend/routers/users.py:21-134`
5. `mobile/src/context/AuthContext.tsx:20-82`
6. `mobile/src/api/auth.ts:8-15`
7. `mobile/src/api/users.ts:4-21`

### Pass 3 — Understand the order engine

1. `backend/models/order.py:10-56`
2. `backend/schemas/order.py:14-131`
3. `backend/services/order_service.py:26-246`
4. `backend/routers/orders.py:58-190`
5. `mobile/src/api/orders.ts:15-57`
6. `mobile/src/screens/OrderDetailScreen.tsx:67-625`

### Pass 4 — Understand the complex feature: group orders

1. `backend/models/group_order_join_request.py:10-43`
2. `backend/services/order_service.py:249-838`
3. `backend/routers/orders.py:193-556`
4. `mobile/src/api/groupOrders.ts:4-89`
5. `mobile/src/screens/GroupOrderDetailScreen.tsx:41-343`

### Pass 5 — Understand supporting systems

1. `backend/models/credit_transaction.py:10-30`
2. `backend/services/credit_service.py:10-64`
3. `backend/models/message.py:10-32`
4. `backend/services/chat_service.py:11-144`
5. `backend/routers/chat.py:17-76`
6. `backend/models/rating.py:10-33`
7. `backend/services/rating_service.py:10-89`

---

## 11. Final summary: what this repo really is

This repository is a well-scoped student product that grew from a straightforward “order and deliver” app into a more complete campus micro-marketplace. Its strongest quality is that the domain rules are real and mostly enforced in the backend. Its most important weakness is that complexity accumulated in the order subsystem faster than architectural boundaries stayed consistent.

If you want one sentence that captures the whole project, it is this:

> DeliverU is a stateful order workflow system wrapped in a mobile campus-delivery UI, with JWT auth, a credit ledger, and a hall-constrained group-order coordination model.

If you want one sentence that captures your biggest architectural lesson from it, it is this:

> The moment a project gains workflow complexity, transaction boundaries and responsibility boundaries matter much more than they seemed to at the beginning.

That is the main thing I would keep in mind when studying this repo again from scratch.
