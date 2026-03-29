"""
api/sessions.py
---------------
Session management endpoints.
"""

from fastapi import APIRouter, HTTPException

from services.session_manager import session_manager

router = APIRouter(tags=["sessions"])


@router.get("/api/session/{session_id}")
async def get_session_info(session_id: str):
    """Return metadata for an existing session. 404 if not found."""
    session = await session_manager.get(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found.")
    return {
        "session_id": session.session_id,
        "turn_count": session.current_turn,
        "files": session.get_file_names(),
        "chapter": session.chapter,
        "history_length": len(session.history),
        "created_at": session.created_at,
        "last_active": session.last_active,
    }


@router.delete("/api/session/{session_id}")
async def delete_session(session_id: str):
    """Clear a session explicitly (e.g. user clicks 'New Chat')."""
    await session_manager.delete(session_id)
    return {"deleted": session_id}
