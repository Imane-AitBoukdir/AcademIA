"""
pdfs/router.py
--------------
FastAPI APIRouter for PDF endpoints.
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import StreamingResponse

from .service import list_chapter_pdfs, list_subject_pdfs, stream_pdf, store_pdf, delete_pdf

router = APIRouter(prefix="/api/pdfs", tags=["pdfs"])

_VALID_PDF_TYPES = {"courses", "exercices", "exams"}
_VALID_SEMESTERS  = {"s1", "s2"}


def _validate_path_params(pdf_type: str, semester: str) -> None:
    if pdf_type not in _VALID_PDF_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid pdf_type. Must be one of: {', '.join(sorted(_VALID_PDF_TYPES))}",
        )
    if semester not in _VALID_SEMESTERS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid semester. Must be one of: {', '.join(sorted(_VALID_SEMESTERS))}",
        )


# ── List all PDFs for a subject (any semester/chapter) ──────────────────────

@router.get("/{pdf_type}/{specialty}/{subject}", response_model=None)
async def list_subject_pdfs_route(
    pdf_type: str,
    specialty: str,
    subject: str,
):
    if pdf_type not in _VALID_PDF_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid pdf_type. Must be one of: {', '.join(sorted(_VALID_PDF_TYPES))}",
        )
    return await list_subject_pdfs(pdf_type, specialty, subject)


# ── List PDFs for a chapter ──────────────────────────────────────────────────

@router.get("/{pdf_type}/{specialty}/{subject}/{semester}/{chapter}")
async def list_pdfs(
    pdf_type: str,
    specialty: str,
    subject: str,
    semester: str,
    chapter: str,
):
    _validate_path_params(pdf_type, semester)
    return await list_chapter_pdfs(pdf_type, specialty, subject, semester, chapter)


# ── Serve a single PDF by file ID ────────────────────────────────────────────

@router.get("/file/{file_id}")
async def serve_pdf(file_id: str):
    grid_out = await stream_pdf(file_id)

    async def _stream():
        while True:
            chunk = await grid_out.read(1024 * 64)
            if not chunk:
                break
            yield chunk

    return StreamingResponse(
        _stream(),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'inline; filename="{grid_out.filename}"',
        },
    )


# ── Upload a PDF ─────────────────────────────────────────────────────────────

@router.post("/upload", status_code=201)
async def upload_pdf(
    file: UploadFile = File(...),
    pdf_type: str = Form(...),
    specialty: str = Form(...),
    subject: str = Form(...),
    semester: str = Form(...),
    chapter: str = Form(...),
    uploaded_by: str = Form(""),
):
    _validate_path_params(pdf_type, semester)

    if file.content_type != "application/pdf":
        raise HTTPException(status_code=415, detail="Only PDF files are accepted.")

    data = await file.read()
    if len(data) > 50 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File exceeds 50 MB limit.")

    file_id = await store_pdf(
        file_bytes=data,
        original_filename=file.filename or "upload.pdf",
        pdf_type=pdf_type,
        specialty=specialty,
        subject=subject,
        semester=semester,
        chapter=chapter,
        uploaded_by=uploaded_by,
    )
    return {"id": file_id, "filename": file.filename}


# ── Delete a PDF ──────────────────────────────────────────────────────────────

@router.delete("/file/{file_id}", status_code=204)
async def delete_pdf_route(file_id: str):
    await delete_pdf(file_id)
    return None
