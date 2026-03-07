# PROJECT KNOWLEDGE BASE

**Stack:** React Native (Expo SDK 54, React 19) + FastAPI (Python 3.10+) + PostgreSQL (async SQLAlchemy + asyncpg)
**Status:** Auth, Profile, Dashboard, Orders, Credits, Chat, Ratings, QR decode, Leaderboard — all implemented. Escrow pending.

---

## BUILD & RUN COMMANDS

### Database (PostgreSQL via Docker)
```bash
cd backend
docker compose up -d              # Start PostgreSQL 16 (port 5432)
docker compose down               # Stop container
docker compose down -v            # Stop + delete data
```

### Backend (FastAPI)
```bash
cd backend
python -m venv venv
venv\Scripts\activate            # Windows  (source venv/bin/activate on macOS/Linux)
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
# Or: start_server.bat           # Windows shortcut (activates venv + runs uvicorn)
# Health check: curl http://localhost:8000/health → {"status":"ok"}
```

### Frontend (React Native / Expo)
```bash
cd mobile
npm install
npm start                         # Expo Go
npm run android                   # Android emulator
npm run ios                       # iOS simulator
npm run web                       # Browser
npx tsc --noEmit                  # Type-check (ONLY available check)
# Tailscale LAN:
npm run start:lan:ts:win          # Windows
npm run start:lan:ts:nix          # macOS/Linux
```

### No CI/CD, Linting, or Test Frameworks
- **No pytest, jest, ruff, ESLint, Prettier** — do NOT invoke them.
- Only verification available: `npx tsc --noEmit` for frontend.

---

## CODE STYLE & CONVENTIONS

### Python (Backend)

**Imports** — stdlib → third-party → local, separated by blank lines:
```python
from datetime import datetime, timezone                 # stdlib
from fastapi import APIRouter, Depends, HTTPException   # third-party
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db                             # local
from models.user import User
```

**Types** — Modern Python 3.10+ unions: `list[str]`, `str | None`, `dict[str, Any]`.
- NO `from typing import List, Dict, Optional`. Exception: `from typing import Any` is OK.

**Naming** — `snake_case` functions/vars, `PascalCase` classes, `UPPER_CASE` constants.
- Private helpers: underscore prefix (`_order_to_response`, `_pwd_ctx`, `_bearer`).

**Error handling** — Routers raise `HTTPException` with `status.HTTP_*` constants. Services raise `HTTPException` for business logic errors or return `None` on lookup failure. Never bare `except:`.

**ORM** — SQLAlchemy 2.0 async style. `Mapped[]` + `mapped_column()`. String UUID primary keys (`default=lambda: str(uuid.uuid4())`). ForeignKey references use `String` type.

**Pydantic** — `BaseModel` for request/response schemas. `field_validator` with `@classmethod`. Response models use `model_config = {"from_attributes": True}` for ORM conversion. Settings via `pydantic-settings` `BaseSettings` with `model_config = {"env_file": ".env"}`.

**Formatting** — 4-space indent. Double blank lines between top-level definitions. Module-level singletons for expensive objects. Triple-quote docstrings required for all public functions.

### TypeScript (Frontend)

**Imports** — React → React Native → third-party → local context/API → local types:
```tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { UserProfile } from '../types';
```

**Types** — `"strict": true` in tsconfig. Use `interface` for data shapes, `type` for unions/aliases. **Never use `any`** — use `unknown` if truly needed. Always type component props and API return types.

**Components** — Functional only: `export default function ComponentName() { ... }`. Named export for hooks/utilities. Destructure props at function signature.

**Styles** — `StyleSheet.create()` at file bottom. Dynamic colors via array syntax: `[styles.x, { color: colors.text }]`. No inline style objects. Theme colors as local `const colors = isDark ? {...} : {...}`.

**State** — `useState`/`useEffect` for local. React Context for global (AuthContext, ToastContext). Context pattern: `createContext<T | undefined>(undefined)` + custom hook with `throw` guard.

**API layer** — Axios with request interceptor for Bearer token. Functions return typed Promises. Interfaces for request payloads defined in the API module files.

**Error handling** — `try/catch` with `Alert.alert()` or `useToast().showToast()` for user-facing errors. Catch blocks do NOT re-throw unless propagating to context.

---

## PROJECT STRUCTURE
```
UST_Delivery/
├── backend/
│   ├── main.py                    # FastAPI app, CORS, lifespan (auto-creates tables)
│   ├── config.py                  # pydantic-settings: database_url, jwt_secret, jwt_algorithm, jwt_expiry_hours
│   ├── database.py                # async engine, session maker, Base, get_db
│   ├── docker-compose.yml         # PostgreSQL 16 container
│   ├── start_server.bat           # Windows shortcut: activate venv + run uvicorn
│   ├── .env                       # DATABASE_URL, JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRY_HOURS
│   ├── requirements.txt           # fastapi, uvicorn, sqlalchemy, asyncpg, pydantic, python-jose, passlib, Pillow, pyzbar
│   ├── models/
│   │   ├── user.py                # User (UUID pk, credentials, profile, credits, average_rating)
│   │   ├── order.py               # Order (orderer/deliverer FKs, items JSON, status, timestamps)
│   │   ├── credit_transaction.py  # CreditTransaction (user FK, amount, reason, order FK)
│   │   ├── rating.py              # Rating (order FK, rater/ratee FKs, stars, feedback)
│   │   └── message.py             # ChatMessage (order FK, sender FK, content, message_type)
│   ├── schemas/
│   │   ├── auth.py                # RegisterRequest, LoginRequest, TokenResponse
│   │   ├── user.py                # ProfileSetupRequest, ProfileResponse, toggle schemas, VALID_HALLS
│   │   ├── order.py               # OrderCreateRequest, OrderResponse, OrderItemSchema, OrderStatusUpdate
│   │   ├── credit.py              # CreditBalanceResponse, CreditHistoryResponse, CreditTransactionResponse
│   │   ├── rating.py              # RateRequest, RatingResponse
│   │   ├── chat.py                # SendMessageRequest, ChatMessageResponse
│   │   ├── qr.py                  # QRDecodeRequest, QRDecodeResponse
│   │   └── stats.py               # LeaderboardEntry, LeaderboardResponse
│   ├── services/
│   │   ├── auth_service.py        # bcrypt hash/verify, JWT create/decode
│   │   ├── order_service.py       # create/accept/pickup/deliver/cancel order, credit integration
│   │   ├── credit_service.py      # add_credit, deduct_credit, get_history
│   │   ├── rating_service.py      # submit_rating, get_order_ratings
│   │   ├── chat_service.py        # send_message, get_messages, create_system_message, delete_chat
│   │   └── qr_service.py          # decode_qr_from_base64 (Pillow + pyzbar)
│   ├── middleware/
│   │   └── auth_middleware.py     # get_current_user FastAPI dependency
│   └── routers/
│       ├── auth.py                # POST /auth/register, /auth/login
│       ├── users.py               # GET/PUT/PATCH /users/me/*
│       ├── orders.py              # POST/GET /orders, /orders/{id}, /orders/{id}/accept|pickup|deliver|cancel
│       ├── credits.py             # GET /credits/balance, /credits/history
│       ├── ratings.py             # POST/GET /orders/{id}/rate, /orders/{id}/ratings
│       ├── chat.py                # POST/GET /orders/{id}/chat
│       ├── qr.py                  # POST /qr/decode
│       └── stats.py               # GET /stats/leaderboard
├── mobile/
│   ├── App.tsx                    # Entry: ToastProvider → AuthProvider → NavigationContainer
│   ├── index.ts                   # registerRootComponent
│   ├── app.json                   # Expo config
│   └── src/
│       ├── api/
│       │   ├── client.ts          # Axios instance, Bearer interceptor, base URL config
│       │   ├── auth.ts            # login, register
│       │   ├── users.ts           # getProfile, setupProfile, toggleDarkMode, toggleDeliverer
│       │   ├── orders.ts          # createOrder, getMyOrders, getDelivererQueue, accept/pickup/deliver/cancel
│       │   ├── credits.ts         # getBalance, getHistory
│       │   ├── ratings.ts         # submitRating, getOrderRatings
│       │   ├── chat.ts            # sendMessage, getMessages
│       │   ├── qr.ts              # decodeQR
│       │   └── stats.ts           # getLeaderboard
│       ├── context/
│       │   ├── AuthContext.tsx     # token, user, login/register/logout/refreshUser
│       │   └── ToastContext.tsx    # showToast/hideToast with Toast component
│       ├── navigation/
│       │   └── RootNavigator.tsx   # Stack nav: Login/Register → ProfileSetup → Dashboard + order screens
│       ├── screens/
│       │   ├── LoginScreen.tsx
│       │   ├── RegisterScreen.tsx
│       │   ├── ProfileSetupScreen.tsx
│       │   ├── DashboardScreen.tsx
│       │   ├── CanteenSelectScreen.tsx
│       │   ├── CanteenWebViewScreen.tsx
│       │   ├── OrderConfirmScreen.tsx
│       │   ├── OrderDetailScreen.tsx
│       │   ├── DelivererQueueScreen.tsx
│       │   ├── MyOrdersScreen.tsx
│       │   └── ChatScreen.tsx
│       ├── components/
│       │   ├── ChipSelector.tsx
│       │   ├── RadioGroup.tsx
│       │   ├── OrderCard.tsx
│       │   ├── StarRating.tsx
│       │   └── Toast.tsx
│       ├── constants/dorms.ts     # HKUST_HALLS, TIME_SLOTS, TAKE_ORDER_LOCATIONS, DELIVERY_HABITS
│       └── types/index.ts         # Order, OrderItem, UserProfile, CreditTransaction, Rating, ChatMessage, LeaderboardEntry, RootStackParamList
└── detailed_plan.md               # Full product specification
```

---

## CRITICAL RULES FOR AGENTS

1. **NO BROKEN CODE** — Run `npx tsc --noEmit` after any TS changes. Backend has no automated checks.
2. **NO HALLUCINATED TOOLS** — No `pytest`, `ruff`, `jest`, `eslint`, `prettier`. They don't exist here.
3. **BACKEND ENTRY** — `uvicorn main:app` from `backend/` dir (NOT `app.main:app`).
4. **DATABASE** — PostgreSQL via Docker. Async SQLAlchemy + asyncpg. Tables auto-created on startup via lifespan.
5. **AUTH FLOW** — Register/Login → JWT → Bearer header → `get_current_user` dependency.
6. **NAV FLOW** — No token → Login/Register. Token + no profile → ProfileSetup. Profile done → Dashboard + order screens.
7. **`.gitignore` GOTCHA** — `models/` is gitignored (originally for ML model files). Backend model files must be force-added: `git add -f backend/models/`.
8. **`.env` SECRETS** — `backend/.env` has dev secrets. Never commit new secrets without confirming.

## ANTI-PATTERNS TO AVOID
- **Python**: `from typing import List, Optional` (use `list[str]`, `str | None`). Bare `except:`. Hardcoded config values.
- **TypeScript**: `any` types. Inline style objects. Mutating state directly. Missing return types on API calls.
- **Both**: Committing without being asked. Adding dependencies without justification. Suppressing type errors (`as any`, `@ts-ignore`).

## DOMAIN CONCEPTS
- **Orderer** — Student ordering food. Pays 1 credit per order.
- **Deliverer** — Student picking up and delivering food. Earns 1 credit per delivery. Same user can be both.
- **Credits** — In-app currency. Users start with 100. Deducted on order creation, awarded on delivery completion.
- **Order lifecycle** — `pending` → `accepted` → `picked_up` → `delivered` (or `cancelled` at any stage).
- **HKUST Halls** — Hall I through Hall XIII (Roman numerals). Defined in `schemas/user.py` and `constants/dorms.ts`.
- **Canteens** — Currently only `LG1`. Validated in `schemas/order.py`.
