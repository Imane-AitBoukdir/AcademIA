"""
Prompt Builder
--------------
Builds the system prompt and the native Gemini multi-turn contents list.
"""

from google.genai import types
from models import Session, HistoryTurn
from config import settings


# ── System prompt ─────────────────────────────────────────────────────────────

def build_system_prompt(language: str, chapter: str = "",
                        summary: str = "", files_context: str = "") -> str:

    chapter_block = (
        f"\nThe student is currently studying: **{chapter}**.\n"
        f"Base ALL explanations strictly on what a Moroccan 2Bac SM student "
        f"is expected to know for this chapter. Do NOT introduce techniques "
        f"or notation beyond their curriculum.\n"
    ) if chapter else ""

    summary_block = (
        f"\n== CONVERSATION SUMMARY (older turns) ==\n{summary}\n"
        f"Use this as background memory and continue naturally.\n"
    ) if summary else ""

    files_block = (
        f"\n== FILES IN THIS SESSION ==\n{files_context}\n"
        f"These files are attached to this conversation. "
        f"Refer to them whenever the student asks about them.\n"
    ) if files_context else ""

    return f"""
You are a friendly, patient, and highly knowledgeable AI tutor designed
specifically for Moroccan students in primary, secondary, and high school.
You are capable of teaching any subject. Adapt your tone to be encouraging.
Continue the same conversation naturally using the provided chat history.

If the user uploads a document or image (like homework), read it carefully
and guide them — do NOT just give answers.
{chapter_block}{summary_block}{files_block}
RESPONSE FORMAT — You MUST respond ONLY with a valid JSON object with exactly
two keys:
1. "display_text": Markdown-formatted response.
    - Every mathematical expression MUST be valid LaTeX wrapped in $...$ or $$...$$.
    - NEVER output bare LaTeX commands outside math delimiters.
    - NEVER output malformed tokens like fracpi2, textArctan(x), sqrtx2.
    - Example: write $\\frac{{\\pi}}{{2}}$, $\\mathbb{{R}}$, $\\arctan(x)$.
2. "spoken_text": Same content in natural spoken words in language ({language}).
   - NO Markdown symbols (*, #, `)
   - NO LaTeX or raw math symbols
   - Write numbers and formulas as a teacher would say them aloud.
""".strip()


# ── Summarizer ────────────────────────────────────────────────────────────────

def summarize_old_turns(client, old_turns: list[HistoryTurn],
                        language: str) -> str:
    if not old_turns:
        return ""

    lines = []
    for t in old_turns:
        speaker = "Assistant" if t.role == "model" else "Student"
        lines.append(f"{speaker}: {t.text[:300]}")   # cap each line

    prompt = (
        f"Summarize the following tutoring conversation turns for memory purposes.\n"
        f"Keep: topics covered, exercises attempted, student mistakes, "
        f"unresolved questions, student's weak points.\n"
        f"Output plain text in {language}. Max 10 short lines.\n\n"
        + "\n".join(lines)
    )

    try:
        r = client.models.generate_content(
            model=settings.GEMINI_FAST_MODEL,
            contents=[prompt],
        )
        return (r.text or "").strip()
    except Exception as e:
        print(f"[prompt_builder] summarization error: {e}")
        return ""


# ── Contents builder ──────────────────────────────────────────────────────────

def build_contents(session: Session, user_message: str) -> list:
    """
    Builds the native Gemini multi-turn contents list.

    Structure:
        [recent history turns]
        + [all session file URIs attached to current user turn]
        + [current user message]
    """
    contents = []

    # 1. Recent verbatim history turns
    recent = session.history[-settings.MAX_RECENT_TURNS:]
    for turn in recent:
        contents.append({
            "role": turn.role,
            "parts": [{"text": turn.text}],
        })

    # 2. Current user turn — re-attach ALL session files silently
    current_parts = []

    for file_uri in session.get_file_uris():
        # Determine mime type from stored metadata
        mime = next(
            (f.mime_type for f in session.uploaded_files
             if f.file_uri == file_uri),
            "application/pdf",
        )
        current_parts.append(
            types.Part.from_uri(file_uri=file_uri, mime_type=mime)
        )

    current_parts.append({"text": user_message})

    contents.append({
        "role": "user",
        "parts": current_parts,
    })

    return contents
