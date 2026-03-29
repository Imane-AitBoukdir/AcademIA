"""
api/exams.py
------------
POST /api/generate-exam — Generate a mock exam PDF via Gemini + LaTeX.
"""

import os
import shutil
import subprocess
import tempfile
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Form, HTTPException
from google.genai import types

import database
from config import settings
from services.gemini_service import gemini_service
from pdfs.service import store_pdf

router = APIRouter(tags=["exams"])

_EXAM_SYSTEM_PROMPT = """
You are an expert exam generator for Moroccan students.
Generate a complete exam in LaTeX format.

RULES:
- Output ONLY valid LaTeX code. No markdown, no explanations, no code fences.
- The document MUST start with \\documentclass and end with \\end{{document}}.
- Use ONLY these packages: amsmath, amssymb, geometry, enumitem, fancyhdr, inputenc, fontenc, babel.
- Do NOT use any custom or exotic packages.
- Include: exam header (subject, level, duration estimate), exercises with point allocations.
- Vary question types: MCQ, short answer, calculations, proofs, analysis.
- Match the style and difficulty of Moroccan official exams.
- Include a grading rubric (bareme) at the end.
- Use utf8 inputenc for French accents.
""".strip()


async def _read_gridfs_bytes(file_id: str) -> tuple[bytes, str]:
    """Read file bytes + filename from GridFS by ID."""
    gridfs = database.get_gridfs()
    oid = ObjectId(file_id)
    grid_out = await gridfs.open_download_stream(oid)
    data = await grid_out.read()
    return data, grid_out.filename


@router.post("/api/generate-exam")
async def generate_exam(
    subject: str = Form(...),
    level: str = Form(...),
    specialty: str = Form(...),
    chapters: str = Form(...),
    language: str = Form("fr"),
    course_pdf_id: Optional[str] = Form(None),
    exam_pdf_id: Optional[str] = Form(None),
):
    # ── 1. Prepare Gemini prompt parts ────────────────────────────────────────
    prompt_parts = []
    has_course = False
    has_exam = False

    if course_pdf_id:
        try:
            data, fname = await _read_gridfs_bytes(course_pdf_id)
            uri, _ = await gemini_service.upload_file(data, fname, "application/pdf")
            prompt_parts.append(types.Part.from_uri(file_uri=uri, mime_type="application/pdf"))
            has_course = True
        except Exception as e:
            print(f"[generate-exam] Failed to load course PDF: {e}")

    if exam_pdf_id:
        try:
            data, fname = await _read_gridfs_bytes(exam_pdf_id)
            uri, _ = await gemini_service.upload_file(data, fname, "application/pdf")
            prompt_parts.append(types.Part.from_uri(file_uri=uri, mime_type="application/pdf"))
            has_exam = True
        except Exception as e:
            print(f"[generate-exam] Failed to load exam PDF: {e}")

    lang_name = "French" if language == "fr" else "Arabic"
    prompt_text = (
        f"Generate a complete mock exam in LaTeX (.tex) format for:\n"
        f"- Subject: {subject}\n"
        f"- Level: {level}\n"
        f"- Chapters to cover: {chapters}\n"
        f"- Language: {lang_name}\n"
    )
    if has_course:
        prompt_text += "A reference course PDF is attached — base the exam content on it.\n"
    if has_exam:
        prompt_text += "A reference exam PDF is attached — match its style, format, and difficulty.\n"
    prompt_text += (
        "\nOutput ONLY the complete LaTeX document code, "
        "starting with \\documentclass and ending with \\end{document}."
    )
    prompt_parts.append(prompt_text)

    # ── 2. Call Gemini ────────────────────────────────────────────────────────
    try:
        response = gemini_service.client.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=prompt_parts,
            config={"system_instruction": _EXAM_SYSTEM_PROMPT},
        )
        latex_code = (response.text or "").strip()
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"AI generation failed: {str(e)}")

    if not latex_code:
        raise HTTPException(status_code=422, detail="AI returned empty response.")

    # Strip markdown code fences if present
    if latex_code.startswith("```"):
        lines = latex_code.split("\n")
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        latex_code = "\n".join(lines)

    # Ensure it starts with \documentclass
    doc_start = latex_code.find("\\documentclass")
    if doc_start > 0:
        latex_code = latex_code[doc_start:]

    # ── 3. Compile LaTeX → PDF ────────────────────────────────────────────────
    pdflatex = shutil.which("pdflatex")
    if not pdflatex:
        raise HTTPException(
            status_code=500,
            detail="LaTeX compiler (pdflatex) not found on server. Install TeX Live or MiKTeX.",
        )

    with tempfile.TemporaryDirectory() as tmpdir:
        tex_path = os.path.join(tmpdir, "exam.tex")
        pdf_path = os.path.join(tmpdir, "exam.pdf")

        with open(tex_path, "w", encoding="utf-8") as f:
            f.write(latex_code)

        # Run pdflatex twice for cross-references
        for _ in range(2):
            try:
                subprocess.run(
                    [pdflatex, "-interaction=nonstopmode",
                     "-output-directory", tmpdir, tex_path],
                    capture_output=True, text=True, timeout=30,
                )
            except subprocess.TimeoutExpired:
                raise HTTPException(status_code=504, detail="LaTeX compilation timed out.")

        if not os.path.exists(pdf_path):
            log_path = os.path.join(tmpdir, "exam.log")
            log_tail = ""
            if os.path.exists(log_path):
                with open(log_path, "r", encoding="utf-8", errors="ignore") as lf:
                    log_tail = lf.read()[-800:]
            raise HTTPException(
                status_code=422,
                detail=f"LaTeX compilation failed.\n{log_tail}",
            )

        with open(pdf_path, "rb") as f:
            pdf_bytes = f.read()

    # ── 4. Store in GridFS ────────────────────────────────────────────────────
    safe_chapters = chapters.replace(", ", "_").replace(" ", "_")[:50]
    filename = f"generated_exam_{safe_chapters}.pdf"

    file_id = await store_pdf(
        file_bytes=pdf_bytes,
        original_filename=filename,
        pdf_type="exams",
        specialty=specialty,
        subject=subject,
        semester="s1",
        chapter="generated",
    )

    return {"id": file_id, "filename": filename}
