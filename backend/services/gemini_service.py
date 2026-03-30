"""
Gemini Service
--------------
Handles file uploads, content generation, and JSON parsing.
Includes exponential backoff retry for transient 503/429 errors.
"""

import os
import time
import tempfile
import json
import random
import re
from google import genai
from google.genai import types
from google.genai.errors import ServerError, ClientError
from config import settings


_RETRYABLE_STATUS = {503, 429, 500, 502, 504}
_BROKEN_MATH_RE = re.compile(
    r"(fracpi\d|mathbbR|text[A-Za-z]+\(|sqrtx|limx|pmsqrt|iffx|ge0|le0|cup\[|infty)",
    re.IGNORECASE,
)
_SINGLE_CHAR_LINES_RE = re.compile(r"(?:\n\s*[A-Za-z0-9]\s*){6,}")


def _is_retryable(exc: Exception) -> bool:
    if isinstance(exc, (ServerError, ClientError)):
        code = getattr(exc, "code", None) or getattr(exc, "status_code", None)
        if code in _RETRYABLE_STATUS:
            return True
    msg = str(exc).lower()
    return any(k in msg for k in ("503", "429", "unavailable", "rate limit", "overloaded"))


def _backoff(attempt: int, base: float = 1.5, cap: float = 32.0) -> float:
    delay = min(cap, base ** attempt)
    return delay + random.uniform(0, delay * 0.3)


class GeminiService:

    def __init__(self):
        self.client = genai.Client(api_key=settings.GEMINI_API_KEY)

    async def upload_file(self, file_bytes: bytes,
                          filename: str, mime_type: str) -> tuple[str, str]:
        ext = os.path.splitext(filename)[1] or ".bin"

        with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
            tmp.write(file_bytes)
            tmp_path = tmp.name

        try:
            uploaded = self.client.files.upload(
                file=tmp_path,
                config=types.UploadFileConfig(mime_type=mime_type),
            )
            file_uri = uploaded.uri or ""
        finally:
            os.remove(tmp_path)

        if not file_uri:
            raise RuntimeError("Gemini upload succeeded but returned no file URI.")

        description = await self._describe_file(file_uri, mime_type)
        return file_uri, description

    async def _describe_file(self, file_uri: str, mime_type: str) -> str:
        try:
            r = self.client.models.generate_content(
                model=settings.GEMINI_FAST_MODEL,
                contents=[
                    types.Part.from_uri(file_uri=file_uri, mime_type=mime_type),
                    "In one sentence, what is this document about?",
                ],
            )
            return (r.text or "").strip()
        except Exception as e:
            print(f"[gemini] describe_file error: {e}")
            return ""

    def verify_file_alive(self, file_uri: str) -> bool:
        try:
            name = file_uri.split("/files/")[-1]
            self.client.files.get(name=f"files/{name}")
            return True
        except Exception:
            return False

    def _call_with_retry(self, system_prompt: str, contents: list) -> str:
        """Low-level generate with exponential-backoff retry. Returns raw text."""
        last_exc = None

        for attempt in range(settings.GEMINI_MAX_RETRIES + 1):
            model = (
                settings.GEMINI_MODEL
                if attempt == settings.GEMINI_MAX_RETRIES
                else settings.GEMINI_FAST_MODEL
            )

            try:
                if attempt > 0:
                    wait = _backoff(attempt)
                    print(f"[gemini] Retry {attempt}/{settings.GEMINI_MAX_RETRIES} "
                          f"using {model} — waiting {wait:.1f}s")
                    time.sleep(wait)

                response = self.client.models.generate_content(
                    model=model,
                    contents=contents,
                    config={"system_instruction": system_prompt},
                )
                return (response.text or "").strip()

            except Exception as exc:
                last_exc = exc
                if _is_retryable(exc):
                    print(f"[gemini] Transient error (attempt {attempt}): {exc}")
                    continue
                else:
                    raise

        raise RuntimeError(
            f"Gemini failed after {settings.GEMINI_MAX_RETRIES} retries. "
            f"Last error: {last_exc}"
        ) from last_exc

    def generate(self, system_prompt: str, contents: list) -> tuple[str, str]:
        raw = self._call_with_retry(system_prompt, contents)
        display_text, spoken_text = self._parse_response(raw)

        if self._needs_display_repair(display_text):
            repaired = self._repair_display_text(display_text)
            if repaired:
                display_text = repaired

        return display_text, spoken_text

    def generate_raw(self, system_prompt: str, contents: list) -> str:
        """Generate raw text (no JSON parsing). Same retry logic as generate()."""
        return self._call_with_retry(system_prompt, contents)

    def _parse_response(self, raw: str) -> tuple[str, str]:
        if raw.startswith("```json"):
            raw = raw[7:]
        elif raw.startswith("```"):
            raw = raw[3:]
        if raw.endswith("```"):
            raw = raw[:-3]
        raw = raw.strip()

        # Remove control characters that break JSON parsing (e.g. from math content)
        cleaned = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', '', raw)

        first_brace = cleaned.find("{")
        last_brace = cleaned.rfind("}")
        candidate = cleaned
        if first_brace != -1 and last_brace != -1 and first_brace < last_brace:
            candidate = cleaned[first_brace:last_brace + 1]

        # Attempt 1: direct JSON parse
        try:
            data = json.loads(candidate)
            display = data.get("display_text", "").strip()
            spoken = data.get("spoken_text", "").strip()
            if display:
                return display, spoken or display
        except json.JSONDecodeError:
            pass

        # Attempt 2: regex extraction for display_text / spoken_text
        display_match = re.search(
            r'"display_text"\s*:\s*"((?:[^"\\]|\\.)*)"', candidate, re.DOTALL
        )
        spoken_match = re.search(
            r'"spoken_text"\s*:\s*"((?:[^"\\]|\\.)*)"', candidate, re.DOTALL
        )
        if display_match:
            display = display_match.group(1).strip()
            # Unescape common JSON escapes
            display = display.replace('\\"', '"').replace('\\n', '\n').replace('\\\\', '\\')
            spoken = display
            if spoken_match:
                spoken = spoken_match.group(1).strip()
                spoken = spoken.replace('\\"', '"').replace('\\n', '\n').replace('\\\\', '\\')
            return display, spoken

        print("[gemini] Warning: response was not valid JSON, using raw text.")
        return raw, raw

    def _needs_display_repair(self, text: str) -> bool:
        if not text:
            return False
        if _BROKEN_MATH_RE.search(text):
            return True
        if _SINGLE_CHAR_LINES_RE.search(text):
            return True
        if "\\frac" in text and "$" not in text:
            return True
        return False

    def _repair_display_text(self, broken_text: str) -> str:
        repair_prompt = (
            "You are a formatter for a tutoring UI. "
            "Fix only formatting in the provided markdown text so it renders correctly.\n"
            "Rules:\n"
            "1) Preserve original language and meaning.\n"
            "2) Keep explanations concise and readable.\n"
            "3) Every math expression must be valid LaTeX inside $...$ or $$...$$.\n"
            "4) Replace malformed tokens like fracpi2, textArctan(x), sqrtx2 with proper LaTeX.\n"
            "5) Return only corrected markdown text, no JSON, no code fences."
        )

        try:
            repaired = self.client.models.generate_content(
                model=settings.GEMINI_FAST_MODEL,
                contents=[repair_prompt, broken_text],
            )
            fixed = (repaired.text or "").strip()
            if fixed.startswith("```"):
                fixed = fixed.strip("`").strip()
            return fixed
        except Exception as e:
            print(f"[gemini] display repair error: {e}")
            return ""


gemini_service = GeminiService()
