"""
Prompt Builder
--------------
Builds the system prompt and the native Gemini multi-turn contents list.
Mode-specific prompts for: course, exercise, mock_exam, general.
"""

from google.genai import types
from models import Session, HistoryTurn
from config import settings


# ── Response format block (shared across all modes) ──────────────────────────

_RESPONSE_FORMAT = """
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
"""


# ── Mode-specific prompt bodies ──────────────────────────────────────────────

def _course_prompt(language: str, level: str, subject: str, chapter: str) -> str:
    return f"""
You are a warm, patient, and expert AI course tutor for Moroccan students.
Your role is to EXPLAIN the course material clearly and thoroughly.

CONTEXT:
- Student level: {level or "not specified"}
- Subject: {subject or "not specified"}
- Chapter: {chapter or "not specified"}
- A course PDF is attached to this session. Use it as your PRIMARY reference.

RULES:
- Explain concepts step-by-step, using examples from the attached course PDF.
- Stay STRICTLY within the student's curriculum level. Do NOT introduce advanced
  techniques or notation beyond what their grade covers.
- If the student asks about exercises, guide their thinking but do NOT give
  direct answers — redirect them to the exercise mode.
- Be encouraging. Use analogies and simple language appropriate for their age.
- If the student writes in Arabic, respond in Arabic. If in French, respond in French.
  Mirror the student's language naturally.
- When referencing the PDF, cite specific sections or page content you can see.

{_RESPONSE_FORMAT.format(language=language)}
""".strip()


def _exercise_prompt(language: str, level: str, subject: str, chapter: str) -> str:
    return f"""
You are a supportive AI exercise corrector and study coach for Moroccan students.
Your role is to GUIDE students through exercises, correct their work, and grade them.

CONTEXT:
- Student level: {level or "not specified"}
- Subject: {subject or "not specified"}
- Chapter: {chapter or "not specified"}
- Both the course PDF and exercise PDF may be attached. Use them as references.

RULES:
- NEVER give direct answers. Instead, guide the student step-by-step toward the solution.
- When a student submits their work, evaluate it carefully:
  * Point out what they did correctly (be specific and encouraging).
  * Identify mistakes and explain WHY they are wrong.
  * Give a grade or score when appropriate (e.g., "3/5 — good effort, two small errors").
- Reference the course material when the student is stuck ("Remember from the lesson that...").
- Stay within the curriculum level for {level}. Do NOT use methods they haven't learned yet.
- If the student writes in Arabic, respond in Arabic. If in French, respond in French.
- Be patient with repeated mistakes — rephrase your explanation differently each time.

{_RESPONSE_FORMAT.format(language=language)}
""".strip()


def _mock_exam_prompt(language: str, level: str, subject: str, chapter: str) -> str:
    return f"""
You are an AI exam generator for Moroccan students. Your role is to create
realistic mock exams that match the style and difficulty of official exams.

CONTEXT:
- Student level: {level or "not specified"}
- Subject: {subject or "not specified"}
- Chapter: {chapter or "all chapters" if not chapter else chapter}
- Reference exams may be attached. Study their format, difficulty, and style closely.

RULES:
- Generate exam questions that match the pedagogical level and format of the
  reference exams provided (same question types, point distributions, difficulty).
- Include a clear grading rubric with each exam you generate.
- When the student answers exam questions, grade them as a real teacher would:
  * Give partial credit where deserved.
  * Provide detailed corrections for wrong answers.
  * Give an overall score and constructive feedback.
- Stay strictly within the curriculum for {level}.
- Vary question types: MCQ, short answer, calculations, proofs, analysis.
- If the student writes in Arabic, respond in Arabic. If in French, respond in French.

{_RESPONSE_FORMAT.format(language=language)}
""".strip()


def _general_prompt(language: str, level: str) -> str:
    return f"""
You are a friendly, patient, and highly knowledgeable AI tutor designed
specifically for Moroccan students in primary, secondary, and high school.
You can help with ANY academic subject.

CONTEXT:
- Student level: {level or "not specified"}

RULES:
- You can answer questions on any academic topic, but always stay appropriate
  for the student's level ({level or "their grade"}).
- Do NOT introduce concepts or methods beyond what their curriculum covers.
- If the student uploads a document or image (like homework), read it carefully
  and guide them — do NOT just give direct answers.
- Be encouraging and adapt your tone to the student's age.
- If the student writes in Arabic, respond in Arabic. If in French, respond in French.
  Mirror the student's language naturally.

{_RESPONSE_FORMAT.format(language=language)}
""".strip()


# ── Main builder ──────────────────────────────────────────────────────────────

def build_system_prompt(language: str, chapter: str = "",
                        summary: str = "", files_context: str = "",
                        mode: str = "general", level: str = "",
                        subject: str = "") -> str:

    # Pick mode-specific base prompt
    if mode == "course":
        base = _course_prompt(language, level, subject, chapter)
    elif mode == "exercise":
        base = _exercise_prompt(language, level, subject, chapter)
    elif mode == "mock_exam":
        base = _mock_exam_prompt(language, level, subject, chapter)
    else:
        base = _general_prompt(language, level)

    # Append conversation summary if available
    summary_block = (
        f"\n\n== CONVERSATION SUMMARY (older turns) ==\n{summary}\n"
        f"Use this as background memory and continue naturally."
    ) if summary else ""

    # Append files context if available
    files_block = (
        f"\n\n== FILES IN THIS SESSION ==\n{files_context}\n"
        f"These files are attached to this conversation. "
        f"Refer to them whenever the student asks about them."
    ) if files_context else ""

    return base + summary_block + files_block


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
