# PROJECT KNOWLEDGE BASE

**Stack:** React Native (Expo SDK 54, React 19, RN 0.81) + FastAPI (Python 3.10+) + PostgreSQL 16 (async SQLAlchemy + asyncpg)
**Status:** Auth, Profile, Dashboard, Orders, Credits, Chat, Ratings, QR decode, Leaderboard, Group Orders — all implemented. Escrow pending.

---

## BUILD & RUN COMMANDS

### Database (PostgreSQL via Docker)
```bash
cd backend
docker compose up -d              # Start PostgreSQL 16 (port 5432, user: deliveru, pass: deliveru_dev)
docker compose down               # Stop container
docker compose down -v            # Stop + delete data (required after schema changes)
```

### Backend (FastAPI)
```bash
cd backend
python -m venv venv
venv\Scripts\activate            # Windows  (source venv/bin/activate on macOS/Linux)
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
# Health check: curl http://localhost:8000/health
# Convenience: start_server.bat (Windows — activates venv + runs uvicorn)
```

### Frontend (React Native / Expo)
```bash
cd mobile
npm install
npm start                         # Expo Go
npm run android                   # Android emulator
npm run ios                       # iOS simulator
npx tsc --noEmit                  # Type-check (ONLY available check)
```

### Verification — IMPORTANT
- **Frontend**: `npx tsc --noEmit` in `mobile/` — the ONLY automated check. Run after ANY TypeScript change.
- **Backend**: No automated checks (no pytest, ruff, mypy). Manually verify by running the server.
- **No CI/CD, linting, or test frameworks.** Do NOT invoke `pytest`, `jest`, `ruff`, `eslint`, `prettier` — they don't exist.
- `backend/test_app.py` and `backend/test_import.py` are ad-hoc debug scripts, NOT test suites.
- **No Alembic migrations.** Tables auto-created via `Base.metadata.create_all` in the FastAPI lifespan event. Schema changes require `docker compose down -v && docker compose up -d`.

---

## CODE STYLE & CONVENTIONS

### Python (Backend)

**Imports** — stdlib, then third-party, then local, separated by blank lines:
```python
from datetime import datetime, timezone                 # stdlib
from fastapi import APIRouter, Depends, HTTPException   # third-party
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db                             # local
from models.user import User
```

**Types** — Modern Python 3.10+ unions: `list[str]`, `str | None`, `dict[str, Any]`.
- NO `from typing import List, Dict, Optional`. Exception: `from typing import Any, ClassVar, cast` is OK.

**Naming** — `snake_case` functions/vars, `PascalCase` classes, `UPPER_CASE` constants.
- Private helpers: underscore prefix (`_order_to_response`, `_format_delivery_habit`, `_bearer`).

**Error handling** — Routers and services both raise `HTTPException` with `status.HTTP_*` constants. Services raise for business logic errors (insufficient credits, invalid state transitions, conflict checks). Never bare `except:`.

**ORM** — SQLAlchemy 2.0 async style. `Mapped[]` + `mapped_column()`. Primary keys are `String` columns with `default=lambda: str(uuid.uuid4())`. JSONB columns for list fields (`order_times`, `preferred_delivery_halls`, `items`). Session uses `expire_on_commit=False`.

**Pydantic** — `BaseModel` for request/response schemas. `field_validator` with `@classmethod`. Response models (only) use `model_config = {"from_attributes": True}`. Settings via `pydantic-settings` `BaseSettings` with `model_config = {"env_file": ".env"}`.

**Router pattern** — `APIRouter(prefix="/resource", tags=["resource"])`. Auth via `Depends(get_current_user)`. DB via `Depends(get_db)`. **Routers commit**: `await db.commit()` + `await db.refresh(obj)` after service calls. Services mutate ORM objects and call `db.flush()` to get generated IDs, but NEVER `db.commit()`.

**Formatting** — 4-space indent. Double blank lines between top-level definitions. Module-level singletons for expensive objects (e.g., `_bearer = HTTPBearer()` in auth_middleware). Triple-quote docstrings for all public functions.

### TypeScript (Frontend)

**Imports** — React, then React Native, then third-party, then local context/API, then local types:
```tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../constants/theme';
import { RootStackParamList } from '../types';
```

**Types** — `"strict": true` in tsconfig (extends `expo/tsconfig.base`). Use `interface` for data shapes, `type` for unions/aliases. **Never use `any`** — use `unknown` if truly needed. Always type component props and API return types.

**Components** — Functional only: `export default function ComponentName() { ... }`. Named export for hooks/utilities. Destructure props at function signature. Props typed via `NativeStackScreenProps<RootStackParamList, 'ScreenName'>`.

**Styles** — `StyleSheet.create()` at file bottom. Dynamic colors via array syntax: `[styles.x, { color: t.colors.text }]`. No inline style objects.

**Theme** — `useTheme()` hook returns `LIGHT_THEME` or `DARK_THEME` based on `user.dark_mode`. Access via `const t = useTheme();` then `t.colors.*`, `t.spacing.*`, `t.radius.*`, `t.typography.*`, `t.shadow.*`.

**State** — `useState`/`useEffect` for local. React Context for global (AuthContext, ToastContext). Context pattern: `createContext<T | undefined>(undefined)` + custom hook with `throw` guard. `useFocusEffect` (from `@react-navigation/native`) for screen-focus data refresh.

**API layer** — Axios with request interceptor for Bearer token (`src/api/client.ts`). Per-resource modules (`src/api/orders.ts`, etc.) export typed async functions. Request payload interfaces defined in API module. Return types reference `src/types/index.ts`. Base URL auto-detected from Expo dev host (LAN IP), with `EXPO_PUBLIC_API_BASE_URL` env override and `Platform.select` fallback.

**Error handling** — `try/catch` with `Alert.alert()` or `useToast().showToast()` for user-facing errors. Catch blocks do NOT re-throw unless propagating to context.

---

## PROJECT STRUCTURE
```
backend/
  main.py              # FastAPI app, CORS (allow_origins=["*"]), lifespan (auto-creates tables)
  config.py            # pydantic-settings: database_url, jwt_secret, jwt_algorithm, jwt_expiry_hours
  database.py          # async engine, async_sessionmaker, DeclarativeBase, get_db dependency
  docker-compose.yml   # PostgreSQL 16 (Alpine) container config
  requirements.txt     # fastapi, uvicorn, sqlalchemy, asyncpg, pydantic, python-jose, passlib, etc.
  models/              # SQLAlchemy ORM: User, Order, CreditTransaction, Rating, ChatMessage, GroupOrderJoinRequest
  schemas/             # Pydantic request/response schemas (mirror routers 1:1)
  services/            # Business logic (order, credit, auth, chat, qr, rating — 6 modules)
  middleware/          # auth_middleware.py: get_current_user dependency (HTTPBearer + JWT decode)
  routers/             # API endpoints: auth, users, orders, credits, ratings, chat, qr, stats (8 routers)
mobile/src/
  api/                 # Typed Axios client (client.ts) + per-resource modules (10 files)
  context/             # AuthContext.tsx, ToastContext.tsx
  navigation/          # RootNavigator.tsx: Stack nav with auth gating
  screens/             # 19 screens: Login, Register, Dashboard, Chat, GroupOrder*, LuckyDraw, etc.
  components/          # AppHeader, ChipSelector, RadioGroup, OrderCard, StarRating, Toast
  constants/           # dorms.ts (halls, time slots, locations), theme.ts (light/dark themes)
  types/index.ts       # All TS interfaces: Order, UserProfile, ChatMessage, RootStackParamList
```

---

## CRITICAL RULES FOR AGENTS

1. **NO BROKEN CODE** — Run `npx tsc --noEmit` (in `mobile/`) after any TS changes. Backend has no automated checks.
2. **NO HALLUCINATED TOOLS** — No `pytest`, `ruff`, `jest`, `eslint`, `prettier`. They don't exist here.
3. **BACKEND ENTRY** — `uvicorn main:app` from `backend/` dir (NOT `app.main:app`).
4. **DATABASE** — PostgreSQL via Docker. Async SQLAlchemy + asyncpg. Tables auto-created on startup via lifespan.
5. **AUTH FLOW** — Register/Login -> JWT -> Bearer header -> `get_current_user` dependency.
6. **NAV FLOW** — No token -> Login/Register. Token + no profile -> ProfileSetup. Profile done -> Dashboard.
7. **`.env` SECRETS** — `backend/.env` has dev secrets. Copy from `.env.example`. Never commit secrets.
8. **COMMIT PATTERN** — Routers do `db.commit()` + `db.refresh()`. Services only mutate + `db.flush()`. Never commit inside a service.
9. **NEW FEATURE CHECKLIST** — Model (`models/`) -> Schema (`schemas/`) -> Service (`services/`) -> Router (`routers/`, register in `main.py`) -> API module (`mobile/src/api/`) -> Types (`mobile/src/types/index.ts`) -> Screen -> Nav registration.
10. **GITIGNORE GOTCHA** — Root `.gitignore` ignores `models/` for ML assets. When adding new ORM model files, force-add: `git add -f backend/models/new_file.py`.

## ANTI-PATTERNS TO AVOID
- **Python**: `from typing import List, Optional` (use `list[str]`, `str | None`). Bare `except:`. Hardcoded config values. Committing DB inside services.
- **TypeScript**: `any` types. Inline style objects. Mutating state directly. Missing return types on API calls. `@ts-ignore` / `@ts-expect-error`.
- **Both**: Committing without being asked. Adding dependencies without justification. Suppressing type errors (`as any`, `@ts-ignore`).

## DOMAIN CONCEPTS
- **Orderer** — Student ordering food. Pays 1 credit per order.
- **Deliverer** — Student picking up and delivering food. Earns 1 credit per delivery. Same user can be both.
- **Credits** — In-app currency. Users start with 100. Deducted on order creation, awarded on delivery completion.
- **Order lifecycle** — `pending` -> `accepted` -> `picked_up` -> `delivered` (or `cancelled` at pending/accepted stage).
- **Group Orders** — Root order with `is_group_open=true`. Others join via join requests (deliverer-approved). All child orders share canteen/hall/deliverer. Lifecycle transitions apply to entire group atomically.
- **HKUST Halls** — Hall I through Hall XIII (Roman numerals). Defined in `schemas/user.py` (`VALID_HALLS`) and `constants/dorms.ts`.
- **Canteens** — `LG1`, `LSK`, `Asia Pacific`, `Oliver Super Sandwich`. Validated in `schemas/order.py` (`VALID_CANTEENS`).
- **Hall Restriction** — Users can only see/join group orders from their own dorm hall.
