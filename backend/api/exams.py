"""
api/exams.py
------------
POST /api/generate-exam   — Generate a mock exam PDF via Gemini + LaTeX.
POST /api/pre-upload-pdfs — Pre-upload subject PDFs to Gemini (cache warming).
"""

import os
import shutil
import subprocess
import tempfile
from typing import Optional

from fastapi import APIRouter, Form, HTTPException
from google.genai import types

import database
from services.gemini_service import gemini_service
from services.file_cache import get_or_upload, pre_upload_pdfs
from pdfs.service import store_pdf

router = APIRouter(tags=["exams"])

_EXAM_SYSTEM_PROMPT = """
You are an expert exam generator for the Moroccan education system (Programme National Marocain).

You have deep knowledge of:
- The official Moroccan curriculum for every level: primaire, collège, lycée (tronc commun,
  1ère bac, 2ème bac — all specialties: Sciences Mathématiques, Sciences Expérimentales,
  Sciences Économiques, Lettres et Sciences Humaines, etc.)
- The style, structure, and difficulty of official Moroccan regional and national exams
  (examens régionaux, examens nationaux du baccalauréat)
- Standard exam formatting: header with subject/level/duration/coefficient, numbered exercises
  (Exercice 1, Exercice 2…) with point allocations, and a barème de notation
- Question types used in Moroccan exams: QCM, Vrai/Faux justifié, questions de cours,
  applications directes, problèmes, démonstrations, analyses de documents

TASK: Generate a complete exam as a LaTeX (.tex) document.

LaTeX RULES:
- Output ONLY valid LaTeX code. No markdown, no explanations, no code fences.
- The document MUST start with \\documentclass and end with \\end{{document}}.
- Use ONLY these packages: amsmath, amssymb, geometry, enumitem, fancyhdr, inputenc,
  fontenc, babel, array, multirow, tabularx.
- Do NOT use any custom or exotic packages.
- Use utf8 inputenc for French accents.

CONTENT RULES:
- Match the exact difficulty and depth appropriate for the student's level.
- Structure the exam like a real Moroccan official exam for that level.
- Include a realistic duration estimate and point total (e.g., /20 or /40).
- Vary question types within the exam.
- Include a barème (grading rubric) showing point breakdown per question.
- If reference PDFs are attached, use them as supplementary material to align questions
  with the specific chapters being studied, but always rely on your knowledge of the
  Moroccan programme to ensure correctness and appropriate difficulty.
""".strip()


@router.post("/api/pre-upload-pdfs")
async def pre_upload_pdfs_endpoint(
    specialty: str = Form(...),
    subject: str = Form(...),
):
    """Pre-upload all course + exam PDFs for a subject to Gemini (cache warming)."""
    try:
        cached = await pre_upload_pdfs(specialty, subject)
        return {"cached": cached, "count": len(cached)}
    except Exception as e:
        print(f"[pre-upload] Error: {e}")
        return {"cached": {}, "count": 0}


@router.post("/api/generate-exam")
async def generate_exam(
    subject: str = Form(...),
    level: str = Form(...),
    specialty: str = Form(...),
    chapters: str = Form(...),
    language: str = Form("fr"),
    course_pdf_id: Optional[str] = Form(None),
    exam_pdf_id: Optional[str] = Form(None),
    course_uri: Optional[str] = Form(None),
    exam_uri: Optional[str] = Form(None),
    uploaded_by: Optional[str] = Form(""),
):
    # ── 1. Prepare Gemini prompt parts ────────────────────────────────────────
    prompt_parts = []
    has_course = False
    has_exam = False

    # Course PDF — prefer pre-cached URI, fall back to upload
    if course_uri:
        prompt_parts.append(types.Part.from_uri(file_uri=course_uri, mime_type="application/pdf"))
        has_course = True
    elif course_pdf_id:
        try:
            uri = await get_or_upload(course_pdf_id)
            if uri:
                prompt_parts.append(types.Part.from_uri(file_uri=uri, mime_type="application/pdf"))
                has_course = True
        except Exception as e:
            print(f"[generate-exam] Failed to load course PDF: {e}")

    # Exam PDF — prefer pre-cached URI, fall back to upload
    if exam_uri:
        prompt_parts.append(types.Part.from_uri(file_uri=exam_uri, mime_type="application/pdf"))
        has_exam = True
    elif exam_pdf_id:
        try:
            uri = await get_or_upload(exam_pdf_id)
            if uri:
                prompt_parts.append(types.Part.from_uri(file_uri=uri, mime_type="application/pdf"))
                has_exam = True
        except Exception as e:
            print(f"[generate-exam] Failed to load exam PDF: {e}")

    lang_name = "French" if language == "fr" else "Arabic"
    prompt_text = (
        f"Generate a complete mock exam in LaTeX (.tex) format.\n\n"
        f"STUDENT CONTEXT:\n"
        f"- Level: {level} (in the Moroccan education system)\n"
        f"- Subject: {subject}\n"
        f"- Chapters to cover: {chapters}\n"
        f"- Exam language: {lang_name}\n\n"
        f"Use your knowledge of the Moroccan national curriculum (Programme National) "
        f"for this level and subject. The exam MUST match the real difficulty, style, "
        f"and format of official Moroccan exams for {level}.\n"
    )
    if has_course:
        prompt_text += (
            "\nA reference course PDF is attached — use it to align questions "
            "with the specific chapter content the student has studied.\n"
        )
    if has_exam:
        prompt_text += (
            "\nA reference exam PDF is attached — match its formatting style, "
            "question structure, and difficulty level.\n"
        )
    prompt_text += (
        "\nOutput ONLY the complete LaTeX document code, "
        "starting with \\documentclass and ending with \\end{document}."
    )
    prompt_parts.append(prompt_text)

    # ── 2. Call Gemini ────────────────────────────────────────────────────────
    try:
        latex_code = gemini_service.generate_raw(
            system_prompt=_EXAM_SYSTEM_PROMPT,
            contents=prompt_parts,
        )
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
        uploaded_by=uploaded_by or "",
    )

    return {"id": file_id, "filename": filename}
