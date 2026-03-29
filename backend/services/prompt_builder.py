"""
Prompt Builder
--------------
Builds the system prompt and the native Gemini multi-turn contents list.
"""

from google.genai import types
from core.models import Session, HistoryTurn
from config import settings


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
- Stay STRICTLY within the student's curriculum level.
- If the student asks about exercises, guide their thinking — redirect them to exercise mode.
- Be encouraging. Use analogies appropriate for their age.
- Mirror the student's language naturally (Arabic ↔ French).
- When referencing the PDF, cite specific sections or page content.

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
- Both the course PDF and exercise PDF may be attached.

RULES:
- NEVER give direct answers. Guide the student step-by-step.
- When a student submits work, evaluate carefully:
  * Point out what they did correctly.
  * Identify mistakes and explain WHY they are wrong.
  * Give a score when appropriate (e.g., "3/5 — two small errors").
- Reference the course material when the student is stuck.
- Stay within the curriculum for {level}.
- Mirror the student's language naturally.

{_RESPONSE_FORMAT.format(language=language)}
""".strip()


def _mock_exam_prompt(language: str, level: str, subject: str, chapter: str) -> str:
    return f"""
You are an AI exam generator for Moroccan students. Create realistic mock exams
matching the style and difficulty of official exams.

CONTEXT:
- Student level: {level or "not specified"}
- Subject: {subject or "not specified"}
- Chapter: {chapter or "all chapters" if not chapter else chapter}
- Reference exams may be attached — study their format and difficulty closely.

RULES:
- Generate questions matching the format of provided reference exams.
- Include a grading rubric with each exam.
- When the student answers, grade as a real teacher: partial credit, detailed corrections.
- Stay strictly within the curriculum for {level}.
- Vary question types: MCQ, short answer, calculations, proofs, analysis.
- Mirror the student's language naturally.

{_RESPONSE_FORMAT.format(language=language)}
""".strip()


def _general_prompt(language: str, level: str) -> str:
    return f"""
You are a friendly, patient, and knowledgeable AI tutor for Moroccan students
in primary, secondary, and high school. You can help with ANY academic subject.

CONTEXT:
- Student level: {level or "not specified"}

RULES:
- Stay appropriate for the student's level ({level or "their grade"}).
- Do NOT introduce concepts beyond what their curriculum covers.
- If the student uploads a document, read it carefully and guide them — do NOT just give direct answers.
- Be encouraging and adapt your tone to the student's age.
- Mirror the student's language naturally (Arabic ↔ French).

{_RESPONSE_FORMAT.format(language=language)}
""".strip()


def build_system_prompt(language: str, chapter: str = "",
                        summary: str = "", files_context: str = "",
                        mode: str = "general", level: str = "",
                        subject: str = "") -> str:
    if mode == "course":
        base = _course_prompt(language, level, subject, chapter)
    elif mode == "exercise":
        base = _exercise_prompt(language, level, subject, chapter)
    elif mode == "mock_exam":
        base = _mock_exam_prompt(language, level, subject, chapter)
    else:
        base = _general_prompt(language, level)

    summary_block = (
        f"\n\n== CONVERSATION SUMMARY (older turns) ==\n{summary}\n"
        f"Use this as background memory and continue naturally."
    ) if summary else ""

    files_block = (
        f"\n\n== FILES IN THIS SESSION ==\n{files_context}\n"
        f"These files are attached to this conversation. "
        f"Refer to them whenever the student asks about them."
    ) if files_context else ""

    return base + summary_block + files_block


def summarize_old_turns(client, old_turns: list[HistoryTurn], language: str) -> str:
    if not old_turns:
        return ""

    lines = []
    for t in old_turns:
        speaker = "Assistant" if t.role == "model" else "Student"
        lines.append(f"{speaker}: {t.text[:300]}")

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


def build_contents(session: Session, user_message: str) -> list:
    contents = []

    recent = session.history[-settings.MAX_RECENT_TURNS:]
    for turn in recent:
        contents.append({
            "role": turn.role,
            "parts": [{"text": turn.text}],
        })

    current_parts = []
    for file_uri in session.get_file_uris():
        mime = next(
            (f.mime_type for f in session.uploaded_files if f.file_uri == file_uri),
            "application/pdf",
        )
        current_parts.append(
            types.Part.from_uri(file_uri=file_uri, mime_type=mime)
        )

    current_parts.append({"text": user_message})
    contents.append({"role": "user", "parts": current_parts})

    return contents
