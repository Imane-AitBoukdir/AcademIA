"""
bulk_import_exercices.py
------------------------
Walk frontend/public/pdfs/exercices/fr/ and import all exercise PDFs into MongoDB GridFS.

Usage:
    cd backend
    python bulk_import_exercices.py

Folder structure expected:
    exercices/fr/{specialty}/{subject}/{semester}/{chapter}/{file}.pdf
"""

import asyncio
import os
import sys
import unicodedata

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorGridFSBucket

SPECIALTY_ALIASES = {
    "2bac_sm": ["2bac_sm_a", "2bac_sm_b"],
}


def normalize_value(value: str) -> str:
    nfkd = unicodedata.normalize("NFD", value)
    without_accents = "".join(c for c in nfkd if unicodedata.category(c) != "Mn")
    return without_accents.lower().replace(" ", "_")


MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
MONGODB_DB  = os.getenv("MONGODB_DB", "academia")

PDFS_ROOT = os.path.join(
    os.path.dirname(__file__), "..", "frontend", "public", "pdfs", "exercices", "fr"
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
            rel = os.path.relpath(dirpath, pdfs_root)
            parts = rel.split(os.sep)

            if len(parts) < 4:
                print(f"  SKIP (path too short): {rel}/{filename}")
                skipped += 1
                continue

            specialty = parts[0]
            subject   = normalize_value(parts[1])
            semester  = parts[2].lower()
            chapter   = normalize_value(parts[3])

            if semester not in ("s1", "s2"):
                print(f"  WARN (unknown semester '{semester}'): {rel}/{filename}")

            try:
                with open(filepath, "rb") as f:
                    data = f.read()

                targets = SPECIALTY_ALIASES.get(specialty, [specialty])
                for sp in targets:
                    exists = await db["pdfs.files"].find_one({
                        "filename": filename,
                        "metadata.specialty": sp,
                        "metadata.subject": subject,
                        "metadata.semester": semester,
                        "metadata.chapter": chapter,
                        "metadata.pdf_type": "exercices",
                    })
                    if exists:
                        skipped += 1
                        continue
                    await gridfs.upload_from_stream(
                        filename,
                        data,
                        metadata={
                            "pdf_type": "exercices",
                            "specialty": sp,
                            "subject": subject,
                            "semester": semester,
                            "chapter": chapter,
                        },
                    )
                uploaded += 1
                print(f"  OK  exercices/{specialty}/{subject}/{semester}/{chapter}/{filename}")
            except Exception as e:
                errors += 1
                print(f"  ERR {filepath}: {e}")

    print(f"\nDone! Uploaded: {uploaded} | Skipped (duplicates): {skipped} | Errors: {errors}")
    client.close()


if __name__ == "__main__":
    asyncio.run(main())
