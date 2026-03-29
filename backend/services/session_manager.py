"""
Session Manager
---------------
Primary store: MongoDB (via Motor).
Fallback: Redis (set REDIS_URL) or in-memory (dev only).
All public methods are async.
"""

import json
import os
import time
import threading
from datetime import datetime, timezone
from typing import Optional

from core.models import Session
from config import settings

try:
    import redis
    _redis_available = True
except ImportError:
    _redis_available = False


class MongoSessionStore:
    def __init__(self, db):
        self._col = db.sessions

    async def get(self, session_id: str) -> Optional[Session]:
        doc = await self._col.find_one({"session_id": session_id})
        if not doc:
            return None
        doc.pop("_id", None)
        doc.pop("expires_at", None)
        return Session(**doc)

    async def set(self, session: Session):
        data = session.model_dump(mode="json")
        data["expires_at"] = datetime.fromtimestamp(
            time.time() + settings.SESSION_TTL_SECONDS, tz=timezone.utc
        )
        await self._col.replace_one(
            {"session_id": session.session_id}, data, upsert=True
        )

    async def delete(self, session_id: str):
        await self._col.delete_one({"session_id": session_id})


class RedisSessionStore:
    def __init__(self, redis_url: str):
        self._r = redis.from_url(redis_url, decode_responses=True)

    async def get(self, session_id: str) -> Optional[Session]:
        raw = self._r.get(f"session:{session_id}")
        if not raw:
            return None
        return Session(**json.loads(raw))

    async def set(self, session: Session):
        self._r.setex(
            f"session:{session.session_id}",
            settings.SESSION_TTL_SECONDS,
            json.dumps(session.model_dump(), default=str),
        )

    async def delete(self, session_id: str):
        self._r.delete(f"session:{session_id}")


class InMemorySessionStore:
    """Dev fallback — not suitable for multi-process deployments."""

    def __init__(self):
        self._store: dict[str, dict] = {}
        self._lock = threading.Lock()
        self._start_cleanup()

    async def get(self, session_id: str) -> Optional[Session]:
        with self._lock:
            entry = self._store.get(session_id)
            if not entry:
                return None
            if time.time() > entry["expires_at"]:
                del self._store[session_id]
                return None
            return Session(**entry["data"])

    async def set(self, session: Session):
        with self._lock:
            self._store[session.session_id] = {
                "data": session.model_dump(),
                "expires_at": time.time() + settings.SESSION_TTL_SECONDS,
            }

    async def delete(self, session_id: str):
        with self._lock:
            self._store.pop(session_id, None)

    def _start_cleanup(self):
        def _cleanup():
            while True:
                time.sleep(600)
                now = time.time()
                with self._lock:
                    expired = [k for k, v in self._store.items()
                               if now > v["expires_at"]]
                    for k in expired:
                        del self._store[k]
        threading.Thread(target=_cleanup, daemon=True).start()


class SessionManager:

    def __init__(self):
        self._store = None

    def init_store(self, db=None):
        """Call at app startup after database.connect()."""
        redis_url = os.getenv("REDIS_URL")
        if redis_url and _redis_available:
            print("[sessions] Using Redis backend")
            self._store = RedisSessionStore(redis_url)
        elif db is not None:
            print("[sessions] Using MongoDB backend")
            self._store = MongoSessionStore(db)
        else:
            print("[sessions] Using in-memory backend (dev only)")
            self._store = InMemorySessionStore()

    async def get_or_create(
        self,
        session_id: Optional[str],
        language: str = "fr-FR",
        chapter: str = "",
        mode: str = "general",
        level: str = "",
        subject: str = "",
    ) -> Session:
        if session_id:
            session = await self._store.get(session_id)
            if session:
                return session
        session = Session(
            language=language, chapter=chapter,
            mode=mode, level=level, subject=subject,
        )
        await self._store.set(session)
        return session

    async def save(self, session: Session):
        await self._store.set(session)

    async def delete(self, session_id: str):
        await self._store.delete(session_id)

    async def get(self, session_id: str) -> Optional[Session]:
        return await self._store.get(session_id)


session_manager = SessionManager()
