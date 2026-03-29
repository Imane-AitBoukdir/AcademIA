import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    # API Keys
    GEMINI_API_KEY: str     = os.getenv("GEMINI_API_KEY", "")
    ELEVENLABS_API_KEY: str = os.getenv("ELEVENLABS_API_KEY", "")

    # Model config
    GEMINI_MODEL: str       = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    GEMINI_FAST_MODEL: str  = os.getenv("GEMINI_FAST_MODEL", "gemini-2.0-flash")

    # ElevenLabs config
    TTS_VOICE_ID: str       = os.getenv("TTS_VOICE_ID", "pNInz6obpgDQGcFmaJgB")
    TTS_MODEL_ID: str       = "eleven_multilingual_v2"
    TTS_OUTPUT_FORMAT: str  = "mp3_44100_128"

    # Retry config
    GEMINI_MAX_RETRIES: int     = 3      # attempts after first failure
    GEMINI_BACKOFF_BASE: float  = 1.5   # seconds (doubles each attempt)
    GEMINI_BACKOFF_CAP: float   = 32.0  # max wait seconds

    # Session config
    MAX_RECENT_TURNS: int   = 8     # full verbatim turns kept
    SESSION_TTL_SECONDS: int = 3600 # 1 hour session expiry

    # MongoDB
    MONGODB_URI: str        = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    MONGODB_DB: str         = os.getenv("MONGODB_DB", "academia")

    # File config
    MAX_FILE_SIZE_MB: int   = 50
    ALLOWED_MIME_TYPES: list = [
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/webp",
    ]

    # CORS
    ALLOWED_ORIGINS: list   = os.getenv("ALLOWED_ORIGINS", "*").split(",")

settings = Settings()