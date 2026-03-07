from fastapi import FastAPI
from routers import auth, users, orders, credits, qr, stats, ratings, chat

app = FastAPI()

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

if __name__ == "__main__":
    import uvicorn
    print("Starting test app...")
    print(f"Routes: {[route.path for route in app.routes]}")
    uvicorn.run(app, host="127.0.0.1", port=8001)
