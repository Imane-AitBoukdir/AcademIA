"""
TTS Service
-----------
Wraps ElevenLabs text-to-speech.
"""

import base64
from elevenlabs.client import ElevenLabs
from config import settings


class TTSService:

    def __init__(self):
        self.client = ElevenLabs(api_key=settings.ELEVENLABS_API_KEY)

    def synthesize(self, text: str) -> str | None:
        """
        Converts text to speech.
        Returns base64-encoded MP3 string, or None on failure.
        """
        if not text or not text.strip():
            return None

        try:
            result = self.client.text_to_speech.convert(
                text=text,
                voice_id=settings.TTS_VOICE_ID,
                model_id=settings.TTS_MODEL_ID,
                output_format=settings.TTS_OUTPUT_FORMAT,
            )

            audio_bytes = result if isinstance(result, bytes) else b"".join(result)
            return base64.b64encode(audio_bytes).decode("utf-8")

        except Exception as e:
            print(f"[tts_service] ElevenLabs error: {e}")
            return None


# Singleton
tts_service = TTSService()
