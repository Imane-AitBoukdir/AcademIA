"""
database.py
-----------
Async MongoDB connection via Motor.
Exposes the database instance and a GridFS bucket helper.
"""

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorGridFSBucket
from config import settings

_client: AsyncIOMotorClient | None = None
_db = None
_gridfs: AsyncIOMotorGridFSBucket | None = None


async def connect():
    """Open the Motor connection pool. Call once at startup."""
    global _client, _db, _gridfs
    _client = AsyncIOMotorClient(settings.MONGODB_URI)
    _db = _client[settings.MONGODB_DB]
    _gridfs = AsyncIOMotorGridFSBucket(_db, bucket_name="pdfs")

    # ── Indexes ──────────────────────────────────────────────────────────────
    # TTL index: MongoDB auto-deletes expired session documents
    await _db.sessions.create_index("expires_at", expireAfterSeconds=0)
    # Unique email for users
    await _db.users.create_index("email", unique=True)

    print(f"[db] Connected to MongoDB → {settings.MONGODB_URI} / {settings.MONGODB_DB}")


async def disconnect():
    """Close the connection pool. Call at shutdown."""
    global _client
    if _client:
        _client.close()
        print("[db] MongoDB connection closed")


def get_db():
    """Return the database instance. Must call connect() first."""
    if _db is None:
        raise RuntimeError("Database not initialised — call connect() first")
    return _db


def get_gridfs() -> AsyncIOMotorGridFSBucket:
    """Return the GridFS bucket for PDF storage."""
    if _gridfs is None:
        raise RuntimeError("Database not initialised — call connect() first")
    return _gridfs
