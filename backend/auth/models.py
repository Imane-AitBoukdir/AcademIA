from pydantic import BaseModel, EmailStr, field_validator
import re

_ALLOWED_NIVAUX = {"primaire", "college", "lycee"}


class SignUpRequest(BaseModel):
    prenom: str
    nom: str
    email: EmailStr
    password: str
    tel: str = ""
    age: int = 0
    niveauScolaire: str = "primaire"
    specialty: str = ""

    @field_validator("prenom", "nom", mode="before")
    @classmethod
    def strip_name(cls, v: str) -> str:
        return v.strip()[:100]

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters.")
        if v.strip() == "":
            raise ValueError("Password cannot be blank.")
        return v

    @field_validator("niveauScolaire")
    @classmethod
    def validate_niveau(cls, v: str) -> str:
        if v not in _ALLOWED_NIVAUX:
            raise ValueError(f"niveauScolaire must be one of {_ALLOWED_NIVAUX}.")
        return v

    @field_validator("age")
    @classmethod
    def validate_age(cls, v: int) -> int:
        if not (0 <= v <= 120):
            raise ValueError("Age must be between 0 and 120.")
        return v

    @field_validator("tel", mode="before")
    @classmethod
    def sanitize_tel(cls, v: str) -> str:
        # Keep only digits, spaces, +, -, ()
        return re.sub(r"[^\d\s\+\-\(\)]", "", v)[:20]

    @field_validator("specialty", mode="before")
    @classmethod
    def sanitize_specialty(cls, v: str) -> str:
        # Alphanumeric + underscores only
        return re.sub(r"[^a-z0-9_]", "", v.lower())[:50]


class SignInRequest(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    prenom: str
    nom: str
    email: str
    tel: str
    age: int
    niveauScolaire: str
    specialty: str
