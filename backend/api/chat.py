"""
api/chat.py
-----------
POST /api/chat — main AI conversation endpoint.
"""

from typing import Optional

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from config import settings
from core.models import ChatResponse
from services.session_manager import session_manager
from services.gemini_service import gemini_service
from services.tts_service import tts_service
from services.prompt_builder import build_system_prompt, build_contents, summarize_old_turns
from services.file_cache import get_or_upload

router = APIRouter(tags=["chat"])


@router.post("/api/chat", response_model=ChatResponse)
async def chat_endpoint(
    message:       str            = Form(...),
    voice:         bool           = Form(False),
    language:      str            = Form("fr-FR"),
    chapter:       str            = Form(""),
    mode:          str            = Form("general"),
    level:         str            = Form(""),
    subject:       str            = Form(""),
    session_id:    Optional[str]  = Form(None),
    reference_pdf: Optional[UploadFile] = File(None),
    file:          Optional[UploadFile] = File(None),
    reference_pdf_id: Optional[str] = Form(None),
    exercise_pdf_id:  Optional[str] = Form(None),
):
    # Validate mode
    valid_modes = {"course", "exercise", "mock_exam", "general"}
    if mode not in valid_modes:
        mode = "general"

    # ── 1. Restore or create session ─────────────────────────────────────────
    session = await session_manager.get_or_create(
        session_id=session_id,
        language=language,
        chapter=chapter,
        mode=mode,
        level=level,
        subject=subject,
    )

    # ── 2. Handle uploaded file (if any) ─────────────────────────────────────
    if file:
        if file.content_type not in settings.ALLOWED_MIME_TYPES:
            raise HTTPException(
                status_code=415,
                detail=f"Unsupported file type: {file.content_type}",
            )

        file_bytes = await file.read()

        if len(file_bytes) > settings.MAX_FILE_SIZE_MB * 1024 * 1024:
            raise HTTPException(
                status_code=413,
                detail=f"File exceeds {settings.MAX_FILE_SIZE_MB} MB limit.",
            )

        file_uri, description = await gemini_service.upload_file(
            file_bytes=file_bytes,
            filename=file.filename,
            mime_type=file.content_type,
        )

        session.add_file(
            file_uri=file_uri,
            name=file.filename,
            mime_type=file.content_type,
            description=description,
        )
        print(f"[chat] File uploaded → {file.filename} | {file_uri}")

    # ── 2b. Handle reference PDF (course/exercise PDF auto-attached) ─────────
    # Prefer cached Gemini URI via GridFS file ID (avoids re-uploading blob)
    if reference_pdf_id:
        existing_names = session.get_file_names()
        ref_name = f"course_{reference_pdf_id}.pdf"
        if ref_name not in existing_names:
            try:
                ref_uri = await get_or_upload(reference_pdf_id)
                if ref_uri:
                    session.add_file(
                        file_uri=ref_uri,
                        name=ref_name,
                        mime_type="application/pdf",
                        description="Course PDF (cached)",
                    )
                    session.reference_pdfs.append(ref_uri)
                    print(f"[chat] Reference PDF from cache → {ref_name} | {ref_uri}")
            except Exception as e:
                print(f"[chat] Cache lookup failed for reference_pdf_id={reference_pdf_id}: {e}")

    elif reference_pdf and reference_pdf.filename:
        existing_names = session.get_file_names()
        if reference_pdf.filename not in existing_names:
            if reference_pdf.content_type in settings.ALLOWED_MIME_TYPES:
                ref_bytes = await reference_pdf.read()
                if len(ref_bytes) <= settings.MAX_FILE_SIZE_MB * 1024 * 1024:
                    ref_uri, ref_desc = await gemini_service.upload_file(
                        file_bytes=ref_bytes,
                        filename=reference_pdf.filename,
                        mime_type=reference_pdf.content_type,
                    )
                    session.add_file(
                        file_uri=ref_uri,
                        name=reference_pdf.filename,
                        mime_type=reference_pdf.content_type,
                        description=ref_desc,
                    )
                    session.reference_pdfs.append(ref_uri)
                    print(f"[chat] Reference PDF uploaded → {reference_pdf.filename} | {ref_uri}")

    # ── 2c. Handle exercise PDF via cache ────────────────────────────────────
    if exercise_pdf_id:
        existing_names = session.get_file_names()
        ex_name = f"exercise_{exercise_pdf_id}.pdf"
        if ex_name not in existing_names:
            try:
                ex_uri = await get_or_upload(exercise_pdf_id)
                if ex_uri:
                    session.add_file(
                        file_uri=ex_uri,
                        name=ex_name,
                        mime_type="application/pdf",
                        description="Exercise PDF (cached)",
                    )
                    print(f"[chat] Exercise PDF from cache → {ex_name} | {ex_uri}")
            except Exception as e:
                print(f"[chat] Cache lookup failed for exercise_pdf_id={exercise_pdf_id}: {e}")

    # ── 3. Verify existing session files are still alive (48h TTL) ───────────
    live_files = []
    for f in session.uploaded_files:
        if gemini_service.verify_file_alive(f.file_uri):
            live_files.append(f)
        else:
            print(f"[chat] File expired and removed from session: {f.original_name}")
    session.uploaded_files = live_files

    # ── 4. Build summary of old turns ────────────────────────────────────────
    old_turns = (
        session.history[: -settings.MAX_RECENT_TURNS]
        if len(session.history) > settings.MAX_RECENT_TURNS
        else []
    )
    summary = summarize_old_turns(gemini_service.client, old_turns, language)

    # ── 5. Build files context block for system prompt ────────────────────────
    files_context = ""
    if session.uploaded_files:
        lines = [
            f"- {f.original_name}: {f.description or 'uploaded by student'}"
            for f in session.uploaded_files
        ]
        files_context = "\n".join(lines)

    # ── 6. Build system prompt + contents ─────────────────────────────────────
    system_prompt = build_system_prompt(
        language=language,
        chapter=chapter or session.chapter,
        summary=summary,
        files_context=files_context,
        mode=mode or session.mode,
        level=level or session.level,
        subject=subject or session.subject,
    )

    contents = build_contents(session=session, user_message=message)

    # ── 7. Generate response ──────────────────────────────────────────────────
    try:
        display_text, spoken_text = gemini_service.generate(
            system_prompt=system_prompt,
            contents=contents,
        )
    except RuntimeError as e:
        print(f"[chat] All retries exhausted: {e}")
        raise HTTPException(
            status_code=503,
            detail="The AI is temporarily unavailable due to high demand. Please try again in a few seconds.",
        )
    except Exception as e:
        print(f"[chat] Unexpected generation error: {e}")
        raise HTTPException(status_code=500, detail=f"AI generation failed: {str(e)}")

    # ── 8. TTS (optional) ─────────────────────────────────────────────────────
    audio_base64 = tts_service.synthesize(spoken_text) if voice else None

    # ── 9. Persist turn + save session ───────────────────────────────────────
    session.add_turn("user", message)
    session.add_turn("model", display_text)
    await session_manager.save(session)

    # ── 10. Return ────────────────────────────────────────────────────────────
    return ChatResponse(
        text=display_text,
        audio=audio_base64,
        session_id=session.session_id,
        files_in_session=session.get_file_names(),
    )
