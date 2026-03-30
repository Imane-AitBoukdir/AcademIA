"""
curriculum/service.py
---------------------
MongoDB CRUD operations for the dynamic curriculum system.
Collections: school_levels, specialties, subjects, chapters
"""

import re
from bson import ObjectId
from fastapi import HTTPException

import database


def _normalize(value: str) -> str:
    """Normalize a string for lookups (strip accents, lowercase, spaces→underscores)."""
    import unicodedata
    nfkd = unicodedata.normalize("NFD", value)
    ascii_str = "".join(c for c in nfkd if unicodedata.category(c) != "Mn")
    return re.sub(r"\s+", "_", ascii_str.strip().lower())


def _db():
    return database.get_db()


# ── Admin verification ───────────────────────────────────────────────────────

async def verify_admin(email: str) -> bool:
    user = await _db().users.find_one({"email": email})
    if not user or user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return True


# ── School levels ────────────────────────────────────────────────────────────

async def list_school_levels():
    cursor = _db().school_levels.find().sort("order", 1)
    return [doc async for doc in cursor]


async def create_school_level(data: dict):
    existing = await _db().school_levels.find_one({"_id": data["id"]})
    if existing:
        raise HTTPException(400, f"School level '{data['id']}' already exists")
    doc = {"_id": data["id"], "label": data["label"], "order": data.get("order", 0)}
    await _db().school_levels.insert_one(doc)
    return doc


async def update_school_level(level_id: str, data: dict):
    updates = {k: v for k, v in data.items() if v is not None}
    if not updates:
        raise HTTPException(400, "Nothing to update")
    result = await _db().school_levels.update_one({"_id": level_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(404, "School level not found")


async def delete_school_level(level_id: str):
    # Cascade: delete specialties, subjects, chapters under this level
    specialties = await _db().specialties.find(
        {"school_level": level_id}, {"_id": 1}
    ).to_list(500)
    spec_ids = [s["_id"] for s in specialties]
    if spec_ids:
        await _db().chapters.delete_many({"specialty_id": {"$in": spec_ids}})
        await _db().subjects.delete_many({"specialty_id": {"$in": spec_ids}})
        await _db().specialties.delete_many({"school_level": level_id})
    result = await _db().school_levels.delete_one({"_id": level_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "School level not found")


# ── Specialties ──────────────────────────────────────────────────────────────

async def list_specialties(school_level: str | None = None):
    query = {"school_level": school_level} if school_level else {}
    cursor = _db().specialties.find(query).sort("order", 1)
    return [doc async for doc in cursor]


async def create_specialty(data: dict):
    # Verify school level exists
    level = await _db().school_levels.find_one({"_id": data["school_level"]})
    if not level:
        raise HTTPException(400, f"School level '{data['school_level']}' not found")
    existing = await _db().specialties.find_one({"_id": data["id"]})
    if existing:
        raise HTTPException(400, f"Specialty '{data['id']}' already exists")
    doc = {
        "_id": data["id"],
        "school_level": data["school_level"],
        "label": data["label"],
        "label_ar": data.get("label_ar", ""),
        "order": data.get("order", 0),
        "enabled": data.get("enabled", True),
    }
    await _db().specialties.insert_one(doc)
    return doc


async def update_specialty(spec_id: str, data: dict):
    updates = {k: v for k, v in data.items() if v is not None}
    if not updates:
        raise HTTPException(400, "Nothing to update")
    result = await _db().specialties.update_one({"_id": spec_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(404, "Specialty not found")


async def delete_specialty(spec_id: str):
    # Cascade: delete subjects and chapters under this specialty
    await _db().chapters.delete_many({"specialty_id": spec_id})
    await _db().subjects.delete_many({"specialty_id": spec_id})
    result = await _db().specialties.delete_one({"_id": spec_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "Specialty not found")


# ── Subjects ─────────────────────────────────────────────────────────────────

async def list_subjects(specialty_id: str):
    cursor = _db().subjects.find({"specialty_id": specialty_id}).sort("order", 1)
    return [doc async for doc in cursor]


async def create_subject(data: dict):
    spec = await _db().specialties.find_one({"_id": data["specialty_id"]})
    if not spec:
        raise HTTPException(400, f"Specialty '{data['specialty_id']}' not found")
    doc = {
        "specialty_id": data["specialty_id"],
        "name": data["name"],
        "order": data.get("order", 0),
        "enabled": data.get("enabled", True),
    }
    result = await _db().subjects.insert_one(doc)
    doc["_id"] = result.inserted_id
    return doc


async def update_subject(subject_id: str, data: dict):
    updates = {k: v for k, v in data.items() if v is not None}
    if not updates:
        raise HTTPException(400, "Nothing to update")
    result = await _db().subjects.update_one(
        {"_id": ObjectId(subject_id)}, {"$set": updates}
    )
    if result.matched_count == 0:
        raise HTTPException(404, "Subject not found")


async def delete_subject(subject_id: str):
    oid = ObjectId(subject_id)
    subj = await _db().subjects.find_one({"_id": oid})
    if not subj:
        raise HTTPException(404, "Subject not found")
    # Cascade: delete chapters for this specialty + subject
    await _db().chapters.delete_many({
        "specialty_id": subj["specialty_id"],
        "subject_norm": _normalize(subj["name"]),
    })
    await _db().subjects.delete_one({"_id": oid})


# ── Chapters ─────────────────────────────────────────────────────────────────

async def list_chapters(specialty_id: str, subject_norm: str):
    cursor = _db().chapters.find({
        "specialty_id": specialty_id,
        "subject_norm": subject_norm,
    }).sort([("semester", 1), ("order", 1)])
    return [doc async for doc in cursor]


async def create_chapter(data: dict):
    doc = {
        "specialty_id": data["specialty_id"],
        "subject_norm": _normalize(data["subject_name"]),
        "semester": data["semester"],
        "name": data["name"],
        "order": data.get("order", 0),
        "enabled": data.get("enabled", True),
    }
    result = await _db().chapters.insert_one(doc)
    doc["_id"] = result.inserted_id
    return doc


async def update_chapter(chapter_id: str, data: dict):
    updates = {k: v for k, v in data.items() if v is not None}
    if not updates:
        raise HTTPException(400, "Nothing to update")
    result = await _db().chapters.update_one(
        {"_id": ObjectId(chapter_id)}, {"$set": updates}
    )
    if result.matched_count == 0:
        raise HTTPException(404, "Chapter not found")


async def delete_chapter(chapter_id: str):
    result = await _db().chapters.delete_one({"_id": ObjectId(chapter_id)})
    if result.deleted_count == 0:
        raise HTTPException(404, "Chapter not found")


# ── Reorder helpers ──────────────────────────────────────────────────────────

async def reorder_subjects(items: list[dict]):
    """Bulk-update order field for subjects. items = [{ id, order }]"""
    from pymongo import UpdateOne
    ops = [
        UpdateOne({"_id": ObjectId(it["id"])}, {"$set": {"order": it["order"]}})
        for it in items
    ]
    if ops:
        await _db().subjects.bulk_write(ops)


async def reorder_chapters(items: list[dict]):
    """Bulk-update order field for chapters. items = [{ id, order }]"""
    from pymongo import UpdateOne
    ops = [
        UpdateOne({"_id": ObjectId(it["id"])}, {"$set": {"order": it["order"]}})
        for it in items
    ]
    if ops:
        await _db().chapters.bulk_write(ops)


# ── Full tree assembly ───────────────────────────────────────────────────────

async def get_full_tree() -> dict:
    """
    Assemble the complete curriculum hierarchy in a single call.
    Returns: { levels: [{ id, label, order, specialties: [{ ... subjects: [{ ... chapters }] }] }] }
    """
    levels = await _db().school_levels.find().sort("order", 1).to_list(100)
    specs = await _db().specialties.find().sort("order", 1).to_list(500)
    subjects = await _db().subjects.find().sort("order", 1).to_list(5000)
    chapters = await _db().chapters.find().sort([("semester", 1), ("order", 1)]).to_list(50000)

    # Index chapters by (specialty_id, subject_norm, semester)
    ch_index: dict[tuple, list] = {}
    for ch in chapters:
        key = (ch["specialty_id"], ch["subject_norm"], ch["semester"])
        ch_index.setdefault(key, []).append({
            "id": str(ch["_id"]),
            "name": ch["name"],
            "semester": ch["semester"],
            "order": ch.get("order", 0),
            "enabled": ch.get("enabled", True),
        })

    # Index subjects by specialty_id
    subj_index: dict[str, list] = {}
    for subj in subjects:
        sid = subj["specialty_id"]
        subj_norm = _normalize(subj["name"])
        subj_index.setdefault(sid, []).append({
            "id": str(subj["_id"]),
            "name": subj["name"],
            "order": subj.get("order", 0),
            "enabled": subj.get("enabled", True),
            "chapters_s1": ch_index.get((sid, subj_norm, "s1"), []),
            "chapters_s2": ch_index.get((sid, subj_norm, "s2"), []),
        })

    # Index specialties by school_level
    spec_index: dict[str, list] = {}
    for sp in specs:
        sl = sp["school_level"]
        spec_index.setdefault(sl, []).append({
            "id": sp["_id"],
            "school_level": sl,
            "label": sp["label"],
            "label_ar": sp.get("label_ar", ""),
            "order": sp.get("order", 0),
            "enabled": sp.get("enabled", True),
            "subjects": subj_index.get(sp["_id"], []),
        })

    # Assemble levels
    tree = []
    for lv in levels:
        tree.append({
            "id": lv["_id"],
            "label": lv["label"],
            "order": lv.get("order", 0),
            "specialties": spec_index.get(lv["_id"], []),
        })

    return {"levels": tree}
