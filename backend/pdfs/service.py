"""
pdfs/service.py
---------------
GridFS-backed PDF storage operations.
"""

import re
from bson import ObjectId
from fastapi import HTTPException

import database

# Only allow safe filename characters (no path traversal)
_SAFE_FILENAME = re.compile(r"[^a-zA-Z0-9_\-. ]")


def sanitize_filename(name: str) -> str:
    name = name.replace("/", "").replace("\\", "").replace("..", "")
    return _SAFE_FILENAME.sub("", name)[:200]


async def list_chapter_pdfs(
    pdf_type: str,
    specialty: str,
    subject: str,
    semester: str,
    chapter: str,
) -> list[dict]:
    """Return all PDF file entries matching the given path components."""
    db = database.get_db()
    query = {
        "metadata.pdf_type": pdf_type,
        "metadata.specialty": specialty,
        "metadata.subject": subject,
        "metadata.semester": semester,
        "metadata.chapter": chapter,
    }
    cursor = db["pdfs.files"].find(query, {"_id": 1, "filename": 1, "uploadDate": 1, "metadata": 1})
    results = []
    async for doc in cursor:
        meta = doc.get("metadata", {})
        results.append({
            "id": str(doc["_id"]),
            "filename": doc["filename"],
            "uploadDate": doc["uploadDate"].isoformat(),
            "uploadedBy": meta.get("uploaded_by", ""),
        })
    return results


async def list_subject_pdfs(
    pdf_type: str,
    specialty: str,
    subject: str,
) -> list[dict]:
    """Return all PDF file entries for a subject across all semesters/chapters."""
    db = database.get_db()
    query = {
        "metadata.pdf_type": pdf_type,
        "metadata.specialty": specialty,
        "metadata.subject": subject,
    }
    cursor = db["pdfs.files"].find(
        query,
        {"_id": 1, "filename": 1, "uploadDate": 1, "metadata": 1},
    )
    results = []
    async for doc in cursor:
        meta = doc.get("metadata", {})
        results.append({
            "id": str(doc["_id"]),
            "filename": doc["filename"],
            "uploadDate": doc["uploadDate"].isoformat(),
            "chapter": meta.get("chapter", ""),
            "semester": meta.get("semester", ""),
            "uploadedBy": meta.get("uploaded_by", ""),
        })
    return results


async def stream_pdf(file_id: str):
    """Open a GridFS download stream by ObjectId string. Raises HTTPException on failure."""
    try:
        oid = ObjectId(file_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid file ID.")

    gridfs = database.get_gridfs()
    try:
        grid_out = await gridfs.open_download_stream(oid)
    except Exception:
        raise HTTPException(status_code=404, detail="File not found.")

    return grid_out


async def store_pdf(
    file_bytes: bytes,
    original_filename: str,
    pdf_type: str,
    specialty: str,
    subject: str,
    semester: str,
    chapter: str,
    uploaded_by: str = "",
) -> str:
    """Upload bytes into GridFS. Returns the new file_id as a string."""
    safe_name = sanitize_filename(original_filename)
    gridfs = database.get_gridfs()
    file_id = await gridfs.upload_from_stream(
        safe_name,
        file_bytes,
        metadata={
            "pdf_type": pdf_type,
            "specialty": specialty,
            "subject": subject,
            "semester": semester,
            "chapter": chapter,
            "uploaded_by": uploaded_by,
        },
    )
    return str(file_id)


async def delete_pdf(file_id: str) -> None:
    """Delete a file from GridFS by its ObjectId string."""
    try:
        oid = ObjectId(file_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid file ID.")

    db = database.get_db()
    doc = await db["pdfs.files"].find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="File not found.")

    gridfs = database.get_gridfs()
    await gridfs.delete(oid)
