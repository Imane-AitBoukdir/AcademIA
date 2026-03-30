"""
services/file_cache.py
----------------------
Caches Gemini File API URIs so PDFs already stored in GridFS
don't need to be re-uploaded on every exam generation.

Gemini files expire after 48 hours, so cached entries use a
TTL index and are re-uploaded automatically when stale.
"""

from datetime import datetime, timedelta, timezone

from bson import ObjectId

import database
from services.gemini_service import gemini_service

_COLLECTION = "gemini_file_cache"
_TTL_HOURS = 47  # slightly under Gemini's 48h to be safe


async def ensure_indexes():
    """Create TTL index on expires_at (call once at startup)."""
    db = database.get_db()
    await db[_COLLECTION].create_index("expires_at", expireAfterSeconds=0)


async def get_cached_uri(gridfs_file_id: str) -> str | None:
    """Return cached Gemini URI for a GridFS file, or None if expired/missing."""
    db = database.get_db()
    doc = await db[_COLLECTION].find_one({
        "gridfs_file_id": gridfs_file_id,
        "expires_at": {"$gt": datetime.now(timezone.utc)},
    })
    if doc:
        # Verify the file is still alive on Gemini
        if gemini_service.verify_file_alive(doc["gemini_uri"]):
            return doc["gemini_uri"]
        # Stale — remove
        await db[_COLLECTION].delete_one({"_id": doc["_id"]})
    return None


async def cache_uri(gridfs_file_id: str, gemini_uri: str, mime_type: str) -> None:
    """Store a Gemini URI in the cache with a 47h TTL."""
    db = database.get_db()
    now = datetime.now(timezone.utc)
    await db[_COLLECTION].update_one(
        {"gridfs_file_id": gridfs_file_id},
        {"$set": {
            "gemini_uri": gemini_uri,
            "mime_type": mime_type,
            "uploaded_at": now,
            "expires_at": now + timedelta(hours=_TTL_HOURS),
        }},
        upsert=True,
    )


async def get_or_upload(gridfs_file_id: str) -> str | None:
    """Return a valid Gemini URI for the given GridFS file.

    Checks cache first; uploads to Gemini if not cached.
    Returns None if the GridFS file doesn't exist.
    """
    cached = await get_cached_uri(gridfs_file_id)
    if cached:
        return cached

    # Read from GridFS
    gridfs = database.get_gridfs()
    try:
        oid = ObjectId(gridfs_file_id)
        grid_out = await gridfs.open_download_stream(oid)
        data = await grid_out.read()
        filename = grid_out.filename
    except Exception as e:
        print(f"[file_cache] Cannot read GridFS file {gridfs_file_id}: {e}")
        return None

    # Upload to Gemini
    try:
        uri, _ = await gemini_service.upload_file(data, filename, "application/pdf")
    except Exception as e:
        print(f"[file_cache] Gemini upload failed for {gridfs_file_id}: {e}")
        return None

    await cache_uri(gridfs_file_id, uri, "application/pdf")
    return uri


async def pre_upload_pdfs(specialty: str, subject: str) -> dict[str, str]:
    """Pre-upload all course + exam PDFs for a subject to Gemini.

    Returns a mapping of { gridfs_file_id: gemini_uri }.
    Skips files that are already cached.
    """
    db = database.get_db()
    query = {
        "metadata.specialty": specialty,
        "metadata.subject": subject,
        "metadata.pdf_type": {"$in": ["courses", "exams"]},
    }
    cursor = db["pdfs.files"].find(query, {"_id": 1})

    result = {}
    async for doc in cursor:
        fid = str(doc["_id"])
        uri = await get_or_upload(fid)
        if uri:
            result[fid] = uri

    return result
