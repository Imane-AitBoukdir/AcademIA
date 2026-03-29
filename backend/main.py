"""
main.py
-------
FastAPI entry point. Registers routers — all logic lives in packages.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
import database
from services.session_manager import session_manager
from auth.router import router as auth_router
from pdfs.router import router as pdf_router
from api.chat import router as chat_router
from api.sessions import router as sessions_router
from api.exams import router as exams_router
from curriculum.router import router as curriculum_router
from curriculum.seed import seed_curriculum
from auth.service import seed_admin


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await database.connect()
    session_manager.init_store(db=database.get_db())
    await seed_admin()
    await seed_curriculum(database.get_db())
    yield
    # Shutdown
    await database.disconnect()


app = FastAPI(title="AI Tutor API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(pdf_router)
app.include_router(chat_router)
app.include_router(sessions_router)
app.include_router(exams_router)
app.include_router(curriculum_router)


# ── Health check ──────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok"}