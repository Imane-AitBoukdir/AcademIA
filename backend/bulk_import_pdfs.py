"""
bulk_import_pdfs.py
-------------------
Walk frontend/public/pdfs/courses/fr/ and import all PDFs into MongoDB GridFS.

Usage:
    cd backend
    python bulk_import_pdfs.py

Folder structure expected:
    courses/fr/{specialty}/{subject}/{semester}/{chapter}/{file}.pdf
    courses/fr/{specialty}/{subject}/Examens Nationaux/{year}/{file}.pdf
"""

import asyncio
import os
import sys
import unicodedata

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorGridFSBucket

# Map disk folder names → frontend specialty IDs
SPECIALTY_ALIASES = {
    "2bac_sm": ["2bac_sm_a", "2bac_sm_b"],
}


def normalize_value(value: str) -> str:
    """Match the frontend normalizeValue(): strip accents, lowercase, spaces→underscores."""
    nfkd = unicodedata.normalize("NFD", value)
    without_accents = "".join(c for c in nfkd if unicodedata.category(c) != "Mn")
    return without_accents.lower().replace(" ", "_")

# ── Config ────────────────────────────────────────────────────────────────────
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
MONGODB_DB  = os.getenv("MONGODB_DB", "academia")

# Path to the PDFs root (adjust if needed)
PDFS_ROOT = os.path.join(
    os.path.dirname(__file__), "..", "frontend", "public", "pdfs", "courses", "fr"
)


async def main():
    client = AsyncIOMotorClient(MONGODB_URI)
    db = client[MONGODB_DB]
    gridfs = AsyncIOMotorGridFSBucket(db, bucket_name="pdfs")

    pdfs_root = os.path.abspath(PDFS_ROOT)
    if not os.path.isdir(pdfs_root):
        print(f"ERROR: Directory not found: {pdfs_root}")
        sys.exit(1)

    print(f"Scanning: {pdfs_root}")
    print(f"Database: {MONGODB_URI} / {MONGODB_DB}\n")

    uploaded = 0
    skipped = 0
    errors = 0

    for dirpath, dirnames, filenames in os.walk(pdfs_root):
        for filename in filenames:
            if not filename.lower().endswith(".pdf"):
                continue

            filepath = os.path.join(dirpath, filename)

            # Build relative path parts:  specialty / subject / semester_or_exams / chapter
            rel = os.path.relpath(dirpath, pdfs_root)
            parts = rel.split(os.sep)

            if len(parts) < 4:
                print(f"  SKIP (path too short): {rel}/{filename}")
                skipped += 1
                continue

            specialty = parts[0]   # e.g. 2bac_sm
            subject   = normalize_value(parts[1])   # e.g. mathematiques
            sem_or_ex = parts[2]   # e.g. s1, s2, or "Examens Nationaux"
            chapter   = normalize_value(parts[3])   # e.g. suites_numeriques

            # Determine pdf_type and semester
            if sem_or_ex.lower() in ("s1", "s2"):
                pdf_type = "courses"
                semester = sem_or_ex.lower()
            elif "examen" in sem_or_ex.lower():
                pdf_type = "exams"
                semester = "exams"
                # chapter is the year folder (e.g. "2023")
            else:
                pdf_type = "courses"
                semester = sem_or_ex
                print(f"  WARN (unknown semester '{sem_or_ex}'): {rel}/{filename}")

            # Upload to GridFS
            try:
                with open(filepath, "rb") as f:
                    data = f.read()

                # Determine all specialty aliases to upload under
                targets = SPECIALTY_ALIASES.get(specialty, [specialty])
                for sp in targets:
                    exists = await db["pdfs.files"].find_one({
                        "filename": filename,
                        "metadata.specialty": sp,
                        "metadata.subject": subject,
                        "metadata.semester": semester,
                        "metadata.chapter": chapter,
                    })
                    if exists:
                        continue
                    await gridfs.upload_from_stream(
                        filename,
                        data,
                        metadata={
                            "pdf_type": pdf_type,
                            "specialty": sp,
                            "subject": subject,
                            "semester": semester,
                            "chapter": chapter,
                        },
                    )
                uploaded += 1
                print(f"  OK  {pdf_type}/{specialty}/{subject}/{semester}/{chapter}/{filename}")
            except Exception as e:
                errors += 1
                print(f"  ERR {filepath}: {e}")

    print(f"\nDone! Uploaded: {uploaded} | Skipped (duplicates): {skipped} | Errors: {errors}")
    client.close()


if __name__ == "__main__":
    asyncio.run(main())
