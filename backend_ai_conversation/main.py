"""
main.py
-------
FastAPI entry point. Thin routes — all logic lives in services.
"""

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional

from config import settings
from models import ChatResponse
from session_manager import session_manager
from gemini_service import gemini_service
from tts_service import tts_service
from prompt_builder import (
    build_system_prompt,
    build_contents,
    summarize_old_turns,
)

app = FastAPI(title="AI Tutor API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── /api/chat ─────────────────────────────────────────────────────────────────

@app.post("/api/chat", response_model=ChatResponse)
async def chat_endpoint(
    message:    str            = Form(...),
    voice:      bool           = Form(False),
    language:   str            = Form("fr-FR"),
    chapter:    str            = Form(""),
    session_id: Optional[str]  = Form(None),
    file:       Optional[UploadFile] = File(None),
):
    # ── 1. Restore or create session ─────────────────────────────────────────
    session = session_manager.get_or_create(
        session_id=session_id,
        language=language,
        chapter=chapter,
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

    # ── 3. Verify existing session files are still alive (48h TTL) ───────────
    #       If a file expired, remove it from session so we don't send dead URIs
    live_files = []
    for f in session.uploaded_files:
        if gemini_service.verify_file_alive(f.file_uri):
            live_files.append(f)
        else:
            print(f"[chat] File expired and removed from session: {f.original_name}")
    session.uploaded_files = live_files

    # ── 4. Build summary of old turns ────────────────────────────────────────
    old_turns  = session.history[:-settings.MAX_RECENT_TURNS] \
                 if len(session.history) > settings.MAX_RECENT_TURNS else []
    summary    = summarize_old_turns(gemini_service.client, old_turns, language)

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
    session.add_turn("user",  message)
    session.add_turn("model", display_text)  # store display_text, not JSON
    session_manager.save(session)

    # ── 10. Return ────────────────────────────────────────────────────────────
    return ChatResponse(
        text=display_text,
        audio=audio_base64,
        session_id=session.session_id,
        files_in_session=session.get_file_names(),
    )


# ── /api/session/{id} ─────────────────────────────────────────────────────────

@app.delete("/api/session/{session_id}")
async def delete_session(session_id: str):
    """Clear a session explicitly (e.g. user clicks 'New Chat')."""
    session_manager.delete(session_id)
    return {"deleted": session_id}


@app.get("/api/session/{session_id}")
async def get_session_info(session_id: str):
    """Debug endpoint — returns session metadata."""
    session = session_manager.get_or_create(session_id)
    return {
        "session_id": session.session_id,
        "turn_count": session.current_turn,
        "files": session.get_file_names(),
        "chapter": session.chapter,
        "history_length": len(session.history),
        "created_at": session.created_at,
        "last_active": session.last_active,
    }


# ── Health check ──────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok"}