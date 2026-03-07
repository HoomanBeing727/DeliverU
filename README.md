# UST Delivery

Peer-to-peer campus food delivery app for HKUST students. Students can order food from canteens and have it delivered by other students using an in-app credit system. This platform facilitates student-led deliveries, allowing orderers to save time and deliverers to earn credits.

## Tech Stack

- **Frontend:** React Native (Expo SDK 54, React 19)
- **Backend:** FastAPI (Python 3.10+)
- **Database:** PostgreSQL 16 (async SQLAlchemy + asyncpg)
- **Infrastructure:** Docker for database containerization

## Prerequisites

- **Node.js:** Latest LTS version (for mobile development)
- **Python:** 3.10 or higher
- **Docker Desktop:** For running the PostgreSQL database
- **Expo Go:** Installed on your physical device for mobile testing

## Getting Started

### 1. Database Setup

The project uses PostgreSQL 16 managed via Docker Compose.

```bash
cd backend
docker compose up -d              # Start PostgreSQL 16 on port 5432
```

Default credentials:
- **User:** `deliveru`
- **Password:** `deliveru_dev`
- **Database:** `deliveru`

### 2. Backend Setup

```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt

# Create .env file based on the following template
# Edit it with your local DATABASE_URL and JWT_SECRET
cp .env.example .env

# Run the server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Verify the backend is running by visiting `http://localhost:8000/health`.

### 3. Frontend Setup

```bash
cd mobile
npm install

# Start Expo dev server
npm start
```

Use the Expo Go app on your phone to scan the QR code and run the application.

## Project Structure

```text
UST_Delivery/
├── backend/
│   ├── main.py                    # FastAPI app entry and lifespan
│   ├── database.py                # Async SQLAlchemy engine and session
│   ├── models/                    # SQLAlchemy ORM models
│   ├── schemas/                   # Pydantic request/response schemas
│   ├── services/                  # Core business logic
│   ├── routers/                   # API endpoint definitions
│   └── middleware/                # Authentication dependencies
├── mobile/
│   └── src/
│       ├── api/                   # Typed Axios client modules
│       ├── screens/               # React Native screen components
│       ├── components/            # Reusable UI elements
│       ├── context/               # Auth and UI state management
│       ├── navigation/            # Stack and tab navigation
│       └── types/                 # TypeScript interfaces and types
└── .sisyphus/                     # Project planning and history
```

## Environment Variables

The backend requires a `.env` file with these keys:

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | - |
| `JWT_SECRET` | Secret key for token signing | - |
| `JWT_ALGORITHM` | Algorithm for JWT | `HS256` |
| `JWT_EXPIRY_HOURS` | Token validity duration | `72` |

## Known Gotchas

### Gitignore Rule for Models
The root `.gitignore` contains a generic `models/` rule intended for machine learning assets. This inadvertently ignores the `backend/models/` directory. When adding new ORM models, you must force-add them:

```bash
git add -f backend/models/*.py
```

### Development Constraints
- **No Test Frameworks:** No Jest or Pytest configured yet.
- **No Linters/Formatters:** No ESLint, Prettier, or Ruff.
- **Verification:** Use `npx tsc --noEmit` in the `mobile` directory to perform type checks.

## Available Scripts

### Backend
- `uvicorn main:app --reload`: Starts the development server.
- `start_server.bat`: Windows shortcut to activate venv and run uvicorn.
- `docker compose down`: Stops the database container.

### Frontend
- `npm start`: Starts the Expo development server.
- `npm run android`: Opens the app in an Android emulator.
- `npm run ios`: Opens the app in an iOS simulator.
- `npx tsc --noEmit`: Runs the TypeScript compiler for type checking.

## Domain Concepts

- **Orderer:** Student requesting food. Pays 1 credit per order.
- **Deliverer:** Student delivering food. Earns 1 credit per delivery.
- **Credits:** Initial balance is 100. Used to pay for delivery service.
- **Lifecycle:** `pending` -> `accepted` -> `picked_up` -> `delivered`.
- **Locations:** HKUST Halls I-XIII and LG1 Canteen.
