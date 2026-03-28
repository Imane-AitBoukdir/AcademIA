"""
Session Manager
---------------
Stores sessions in memory by default.
Swap the backend to Redis by setting REDIS_URL in your .env.
"""

import json
import time
import threading
from typing import Optional
from models import Session
from config import settings

try:
    import redis
    _redis_available = True
except ImportError:
    _redis_available = False


class InMemorySessionStore:
    """Thread-safe in-memory store. Fine for single-process deployments."""

    def __init__(self):
        self._store: dict[str, dict] = {}
        self._lock = threading.Lock()
        self._start_cleanup()

    def get(self, session_id: str) -> Optional[Session]:
        with self._lock:
            entry = self._store.get(session_id)
            if not entry:
                return None
            if time.time() > entry["expires_at"]:
                del self._store[session_id]
                return None
            return Session(**entry["data"])

    def set(self, session: Session):
        with self._lock:
            self._store[session.session_id] = {
                "data": session.model_dump(),
                "expires_at": time.time() + settings.SESSION_TTL_SECONDS,
            }

    def delete(self, session_id: str):
        with self._lock:
            self._store.pop(session_id, None)

    def _start_cleanup(self):
        """Background thread removes expired sessions every 10 minutes."""
        def _cleanup():
            while True:
                time.sleep(600)
                now = time.time()
                with self._lock:
                    expired = [k for k, v in self._store.items()
                               if now > v["expires_at"]]
                    for k in expired:
                        del self._store[k]
        t = threading.Thread(target=_cleanup, daemon=True)
        t.start()


class RedisSessionStore:
    """Redis-backed store for multi-process / multi-server deployments."""

    def __init__(self, redis_url: str):
        self._r = redis.from_url(redis_url, decode_responses=True)

    def get(self, session_id: str) -> Optional[Session]:
        raw = self._r.get(f"session:{session_id}")
        if not raw:
            return None
        return Session(**json.loads(raw))

    def set(self, session: Session):
        self._r.setex(
            f"session:{session.session_id}",
            settings.SESSION_TTL_SECONDS,
            json.dumps(session.model_dump(), default=str),
        )

    def delete(self, session_id: str):
        self._r.delete(f"session:{session_id}")


# ── Public interface ──────────────────────────────────────────────────────────

class SessionManager:

    def __init__(self):
        redis_url = __import__("os").getenv("REDIS_URL")
        if redis_url and _redis_available:
            print("SessionManager: using Redis backend")
            self._store = RedisSessionStore(redis_url)
        else:
            print("SessionManager: using in-memory backend")
            self._store = InMemorySessionStore()

    def get_or_create(self, session_id: Optional[str],
                      language: str = "fr-FR",
                      chapter: str = "") -> Session:
        if session_id:
            session = self._store.get(session_id)
            if session:
                return session
        # Create fresh session
        session = Session(language=language, chapter=chapter)
        self._store.set(session)
        return session

    def save(self, session: Session):
        self._store.set(session)

    def delete(self, session_id: str):
        self._store.delete(session_id)


# Singleton
session_manager = SessionManager()
