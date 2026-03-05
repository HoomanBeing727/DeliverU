# PROJECT KNOWLEDGE BASE

**Stack:** React Native (Expo SDK 55) + FastAPI (Python 3.10+) + PostgreSQL (async SQLAlchemy)
**Status:** Early dev — Auth (JWT), Profile Setup, Dashboard implemented. Order creation, Queue, Escrow pending.

---

## BUILD & RUN COMMANDS

### Database (PostgreSQL via Docker)
```bash
cd backend
docker compose up -d              # Start PostgreSQL container (port 5432)
docker compose down               # Stop container
docker compose down -v            # Stop + delete data
```

### Backend (FastAPI)
```bash
cd backend
python -m venv venv
venv\Scripts\activate            # Windows
# source venv/bin/activate        # macOS/Linux
pip install -r requirements.txt

# Run Dev Server
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# No pytest — no test framework configured yet.
```

# Health Check (when running)
curl http://100.69.255.57:8000/health    # Should return {"status":"ok"}

### Frontend (React Native / Expo)
```bash
cd mobile
npm install

# Run Dev
npm start                         # Expo Go
npm run android                   # Android Emulator
npm run ios                       # iOS Simulator
npm run web                       # Web Browser

# Type Check (no ESLint/Prettier configured)
npx tsc --noEmit

# SSH + Tailscale Development
# Set API base URL (optional, falls back to Tailscale IP)
# EXPO_PUBLIC_API_BASE_URL=http://100.69.255.57:8000 npm start

# Run Expo with LAN mode over Tailscale
npm run start:lan:ts:win         # Windows cmd
npm run start:lan:ts:nix         # macOS/Linux
```

### No CI/CD, Linting, or Test Frameworks Configured
- **No pytest, jest, ruff, ESLint, or Prettier** — do not invoke them.
- Frontend type checking: `npx tsc --noEmit` only.

---

## PROJECT STRUCTURE
```
UST_Delivery/
├── backend/
│   ├── main.py                    # FastAPI app, CORS, lifespan (table creation)
│   ├── config.py                  # pydantic-settings, reads .env
│   ├── database.py                # async SQLAlchemy engine, session, Base, get_db
│   ├── docker-compose.yml         # PostgreSQL 16 container
│   ├── .env                       # DATABASE_URL, JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRY_HOURS
│   ├── requirements.txt
│   ├── models/
│   │   └── user.py                # SQLAlchemy User model (UUID, profile fields, JSONB)
│   ├── schemas/
│   │   ├── auth.py                # RegisterRequest, LoginRequest, TokenResponse
│   │   └── user.py                # ProfileSetupRequest, ProfileResponse, toggles
│   ├── services/
│   │   └── auth_service.py        # hash/verify password (bcrypt), create/decode JWT
│   ├── middleware/
│   │   └── auth_middleware.py     # get_current_user dependency (Bearer → User)
│   └── routers/
│       ├── auth.py                # POST /auth/register, POST /auth/login
│       └── users.py               # GET/PUT/PATCH /users/me/*
├── mobile/
│   ├── App.tsx                    # Entry: AuthProvider + NavigationContainer
│   └── src/
│       ├── api/
│       │   ├── client.ts          # Axios instance with auth interceptor
│       │   ├── auth.ts            # registerUser, loginUser
│       │   └── users.ts           # getProfile, setupProfile, toggleDarkMode, toggleDeliverer
│       ├── context/
│       │   └── AuthContext.tsx     # token, user, isLoading, login/register/logout/refreshUser
│       ├── navigation/
│       │   └── RootNavigator.tsx   # Conditional: Login → ProfileSetup → Dashboard
│       ├── screens/
│       │   ├── LoginScreen.tsx
│       │   ├── RegisterScreen.tsx
│       │   ├── ProfileSetupScreen.tsx
│       │   └── DashboardScreen.tsx
│       ├── components/
│       │   ├── ChipSelector.tsx    # Multi/single select chip component
│       │   └── RadioGroup.tsx      # Single select radio button component
│       ├── constants/
│       │   └── dorms.ts           # HKUST_HALLS, TIME_SLOTS, locations, habits
│       └── types/
│           └── index.ts           # UserProfile, ProfileSetupPayload, RootStackParamList
├── detailed_plan.md               # Product specification
└── AGENTS.md                      # This file
```

---

## API ENDPOINTS

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | No | Register with HKUST email + password |
| POST | `/auth/login` | No | Login, returns JWT |
| GET | `/users/me` | Yes | Get current user profile |
| PUT | `/users/me/profile` | Yes | Create/update profile |
| PATCH | `/users/me/dark-mode` | Yes | Toggle dark mode |
| PATCH | `/users/me/deliverer-toggle` | Yes | Toggle deliverer status |
| GET | `/health` | No | Health check |

---

## CODE STYLE & CONVENTIONS

### Python (Backend)
- **Imports**: Stdlib → Third-party → Local, separated by blank lines.
  ```python
  import uuid                              # stdlib

  from fastapi import APIRouter            # third-party

  from database import get_db              # local
  ```
- **Types**: Modern Python 3.10+ syntax. `list[str]`, `dict[str, Any]`, `float | None`.
  - NO `from typing import List, Dict, Optional`. Exception: `from typing import Any` is OK.
- **Naming**: `snake_case` (vars/funcs), `PascalCase` (classes), `UPPER_CASE` (constants).
  - Private helpers prefixed with underscore: `_user_to_response()`.
- **Error Handling**: Routers raise `HTTPException` with appropriate status codes.
  - Use `except Exception as e:` with `str(e)` — never bare `except:`.
- **Formatting**: 4 spaces indent. Double blank lines between top-level functions.
- **Singletons**: Module-level singletons for expensive objects: `_pwd_ctx = CryptContext(...)`.
- **Docstrings**: Triple-quote on function definition. Describe purpose for public functions.
- **ORM**: SQLAlchemy 2.0 style with `Mapped[]` annotations and `mapped_column()`.

### TypeScript (Frontend)
- **Imports**: React → React Native → Third-party → Local context/hooks → Local types.
  ```tsx
  import React, { useState } from 'react';
  import { View, Text, StyleSheet } from 'react-native';
  import { NativeStackScreenProps } from '@react-navigation/native-stack';
  import { useAuth } from '../context/AuthContext';
  import { RootStackParamList } from '../types';
  ```
- **Types**: Strict mode (`"strict": true` in tsconfig). Use `interface` for shapes.
  - Avoid `any` (use `unknown` if needed).
  - Always type component props: `type Props = NativeStackScreenProps<RootStackParamList, 'ScreenName'>`.
- **Components**: Functional only. `export default function ComponentName(...)`. Destructure props.
- **Styles**: `StyleSheet.create()` at bottom of file. Dynamic colors via `[styles.x, { color: colors.y }]`.
  - No inline style objects — use array syntax with theme colors.
- **Naming**: `PascalCase` (components, interfaces), `camelCase` (functions, variables).
- **State**: `useState`/`useEffect` for local state. React Context for global (auth, theme).
- **Navigation**: React Navigation Native Stack. Conditional navigation driven by AuthContext state.
- **API**: Axios with auth interceptor. Platform-aware base URL in `client.ts`.

---

## KNOWN ISSUES

1. **API Base URL**: Use `EXPO_PUBLIC_API_BASE_URL` env var (default fallback: Tailscale IP `100.69.255.57:8000` for native, `localhost:8000` for web).
2. **No backend tests**: No test scripts or test framework configured yet.
3. **`.env` in repo**: `backend/.env` contains dev secrets. Ensure it stays in `.gitignore`.
4. **Firewall**: Ensure Windows firewall allows inbound on port 8000 (backend) and Expo Metro port (usually 8081) for Tailscale access.

---

## CRITICAL RULES FOR AGENTS

1. **NO BROKEN CODE**: Do not leave the repo in a broken state. Run `npx tsc --noEmit` after TS changes.
2. **NO HALLUCINATED TOOLS**: Do not use `pytest`, `ruff`, `jest`, `eslint`, or `prettier` — they are not installed.
3. **BACKEND ENTRY POINT**: `uvicorn main:app` (NOT `app.main:app`). The `main.py` is at `backend/` root.
4. **DATABASE**: PostgreSQL via Docker Compose. Async SQLAlchemy with `asyncpg` driver. Tables auto-created on startup.
5. **AUTH FLOW**: Register/Login → JWT token → Bearer header → `get_current_user` dependency.
6. **NAVIGATION FLOW**: No token → Login/Register. Token but no profile → ProfileSetup. Profile complete → Dashboard.

## ANTI-PATTERNS TO AVOID
- Python: Hardcoded paths (extract to constants). Bare `except:`. `from typing import List, Optional`.
- TypeScript: `any` types. Inline styles. Mutating state directly. Missing prop types.
- Both: Committing without being asked. Adding dependencies without justification.

## DOMAIN CONCEPTS
- **Orderer**: User ordering food via the app.
- **Deliverer**: Student picking up and delivering food.
- **Escrow**: Payment holding mechanism (not yet implemented).
- **HKUST Halls**: Hall I through Hall XIII (Roman numerals).
- **Profile**: Nickname, dorm hall, order times, delivery preferences. Must be completed before accessing Dashboard.
