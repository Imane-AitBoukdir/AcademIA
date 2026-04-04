"""
curriculum/router.py
--------------------
REST endpoints for curriculum management.
Public: GET /api/curriculum (full tree)
Admin-only: CRUD for school levels, specialties, subjects, chapters + reorder.
"""

from fastapi import APIRouter, Depends, Header, HTTPException

from . import service
from .models import (
    ChapterIn,
    ChapterUpdate,
    ReorderRequest,
    SchoolLevelIn,
    SpecialtyIn,
    SpecialtyUpdate,
    SubjectIn,
    SubjectUpdate,
)

router = APIRouter(prefix="/api/curriculum", tags=["curriculum"])


# ── Admin dependency ─────────────────────────────────────────────────────────

async def admin_required(x_admin_email: str = Header(...)):
    await service.verify_admin(x_admin_email)
    return x_admin_email


# ── Public: full tree ────────────────────────────────────────────────────────

@router.get("")
async def get_curriculum_tree():
    return await service.get_full_tree()


# ── School levels ────────────────────────────────────────────────────────────

@router.post("/school-levels", status_code=201)
async def create_school_level(body: SchoolLevelIn, _=Depends(admin_required)):
    doc = await service.create_school_level(body.model_dump())
    return {"id": doc["_id"], "label": doc["label"], "order": doc["order"]}


@router.put("/school-levels/{level_id}")
async def update_school_level(level_id: str, body: SchoolLevelIn, _=Depends(admin_required)):
    await service.update_school_level(level_id, {"label": body.label, "order": body.order})
    return {"ok": True}


@router.delete("/school-levels/{level_id}", status_code=204)
async def delete_school_level(level_id: str, _=Depends(admin_required)):
    await service.delete_school_level(level_id)


# ── Specialties ──────────────────────────────────────────────────────────────

@router.post("/specialties", status_code=201)
async def create_specialty(body: SpecialtyIn, _=Depends(admin_required)):
    doc = await service.create_specialty(body.model_dump())
    return {"id": doc["_id"], "label": doc["label"], "order": doc["order"]}


@router.put("/specialties/{spec_id}")
async def update_specialty(spec_id: str, body: SpecialtyUpdate, _=Depends(admin_required)):
    await service.update_specialty(spec_id, body.model_dump(exclude_none=True))
    return {"ok": True}


@router.delete("/specialties/{spec_id}", status_code=204)
async def delete_specialty(spec_id: str, _=Depends(admin_required)):
    await service.delete_specialty(spec_id)


# ── Subjects ─────────────────────────────────────────────────────────────────

@router.post("/subjects", status_code=201)
async def create_subject(body: SubjectIn, _=Depends(admin_required)):
    doc = await service.create_subject(body.model_dump())
    return {"id": str(doc["_id"]), "name": doc["name"], "order": doc["order"]}


@router.put("/subjects/reorder")
async def reorder_subjects(body: ReorderRequest, _=Depends(admin_required)):
    await service.reorder_subjects([it.model_dump() for it in body.items])
    return {"ok": True}


@router.put("/subjects/{subject_id}")
async def update_subject(subject_id: str, body: SubjectUpdate, _=Depends(admin_required)):
    await service.update_subject(subject_id, body.model_dump(exclude_none=True))
    return {"ok": True}


@router.delete("/subjects/{subject_id}", status_code=204)
async def delete_subject(subject_id: str, _=Depends(admin_required)):
    await service.delete_subject(subject_id)


# ── Chapters ─────────────────────────────────────────────────────────────────

@router.post("/chapters", status_code=201)
async def create_chapter(body: ChapterIn, _=Depends(admin_required)):
    doc = await service.create_chapter(body.model_dump())
    return {"id": str(doc["_id"]), "name": doc["name"], "semester": doc["semester"], "order": doc["order"]}


@router.put("/chapters/reorder")
async def reorder_chapters(body: ReorderRequest, _=Depends(admin_required)):
    await service.reorder_chapters([it.model_dump() for it in body.items])
    return {"ok": True}


@router.put("/chapters/{chapter_id}")
async def update_chapter(chapter_id: str, body: ChapterUpdate, _=Depends(admin_required)):
    await service.update_chapter(chapter_id, body.model_dump(exclude_none=True))
    return {"ok": True}


@router.delete("/chapters/{chapter_id}", status_code=204)
async def delete_chapter(chapter_id: str, _=Depends(admin_required)):
    await service.delete_chapter(chapter_id)
