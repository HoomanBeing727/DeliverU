from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import engine, Base
from routers import auth, users, orders, credits, qr, stats, ratings, chat
from models.message import ChatMessage
from models.group_order_join_request import GroupOrderJoinRequest


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create database tables on startup."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(title="DeliverU API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(orders.router)
app.include_router(credits.router)
app.include_router(qr.router)
app.include_router(stats.router)
app.include_router(ratings.router)
app.include_router(chat.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
