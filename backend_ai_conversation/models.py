from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
import uuid


# ── Request / Response schemas ──────────────────────────────────────────────

class ChatResponse(BaseModel):
    text: str
    audio: Optional[str] = None        # base64 mp3
    session_id: str
    files_in_session: list[str] = []   # filenames user has uploaded this session


# ── Internal data models ─────────────────────────────────────────────────────

class UploadedFile(BaseModel):
    file_uri: str
    original_name: str
    mime_type: str
    description: str = ""
    turn_uploaded: int = 0
    uploaded_at: datetime = Field(default_factory=datetime.now)


class HistoryTurn(BaseModel):
    role: str   # "user" | "model"
    text: str


class Session(BaseModel):
    session_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    student_id: str = ""
    language: str = "fr-FR"
    chapter: str = ""
    history: list[HistoryTurn] = []
    uploaded_files: list[UploadedFile] = []
    current_turn: int = 0
    created_at: datetime = Field(default_factory=datetime.now)
    last_active: datetime = Field(default_factory=datetime.now)

    # ── Helpers ───────────────────────────────────────────────────────────────

    def add_file(self, file_uri: str, name: str,
                 mime_type: str, description: str = ""):
        self.uploaded_files.append(UploadedFile(
            file_uri=file_uri,
            original_name=name,
            mime_type=mime_type,
            description=description,
            turn_uploaded=self.current_turn,
        ))

    def add_turn(self, role: str, text: str):
        self.history.append(HistoryTurn(role=role, text=text))
        if role == "user":
            self.current_turn += 1
        self.last_active = datetime.now()

    def get_file_uris(self) -> list[str]:
        return [f.file_uri for f in self.uploaded_files]

    def get_file_names(self) -> list[str]:
        return [f.original_name for f in self.uploaded_files]
