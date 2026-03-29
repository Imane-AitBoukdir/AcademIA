"""
curriculum/models.py
--------------------
Pydantic models for the dynamic curriculum CRUD system.
"""

from pydantic import BaseModel, Field
from typing import Optional


# ── Create / Update inputs ───────────────────────────────────────────────────

class SchoolLevelIn(BaseModel):
    id: str = Field(..., min_length=1, max_length=60)
    label: str = Field(..., min_length=1, max_length=120)
    order: int = 0


class SpecialtyIn(BaseModel):
    id: str = Field(..., min_length=1, max_length=80)
    school_level: str = Field(..., min_length=1)
    label: str = Field(..., min_length=1, max_length=200)
    label_ar: str = ""
    order: int = 0


class SpecialtyUpdate(BaseModel):
    label: Optional[str] = None
    label_ar: Optional[str] = None
    order: Optional[int] = None


class SubjectIn(BaseModel):
    specialty_id: str = Field(..., min_length=1)
    name: str = Field(..., min_length=1, max_length=200)
    order: int = 0


class SubjectUpdate(BaseModel):
    name: Optional[str] = None
    order: Optional[int] = None


class ChapterIn(BaseModel):
    specialty_id: str = Field(..., min_length=1)
    subject_name: str = Field(..., min_length=1)
    semester: str = Field(..., pattern=r"^s[12]$")
    name: str = Field(..., min_length=1, max_length=300)
    order: int = 0


class ChapterUpdate(BaseModel):
    name: Optional[str] = None
    semester: Optional[str] = Field(None, pattern=r"^s[12]$")
    order: Optional[int] = None


# ── Reorder ──────────────────────────────────────────────────────────────────

class ReorderItem(BaseModel):
    id: str
    order: int


class ReorderRequest(BaseModel):
    items: list[ReorderItem] = Field(..., min_length=1)


# ── Response models (nested tree) ────────────────────────────────────────────

class ChapterOut(BaseModel):
    id: str
    name: str
    semester: str
    order: int = 0


class SubjectOut(BaseModel):
    id: str
    name: str
    order: int = 0
    chapters_s1: list[ChapterOut] = []
    chapters_s2: list[ChapterOut] = []


class SpecialtyOut(BaseModel):
    id: str
    school_level: str
    label: str
    label_ar: str = ""
    order: int = 0
    subjects: list[SubjectOut] = []


class SchoolLevelOut(BaseModel):
    id: str
    label: str
    order: int = 0
    specialties: list[SpecialtyOut] = []


class CurriculumTree(BaseModel):
    levels: list[SchoolLevelOut] = []
