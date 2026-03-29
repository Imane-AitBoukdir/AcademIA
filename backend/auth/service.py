"""
Auth Service
------------
Business logic for signup and signin.
bcrypt is used for password hashing (constant-time comparison built in).
"""

from datetime import datetime, timezone

import bcrypt
from fastapi import HTTPException

import database
from .models import SignUpRequest, SignInRequest, UserOut


_ADMIN_EMAIL = "admin@academia.ma"
_ADMIN_PASSWORD = "Admin@2024"


async def signup_user(body: SignUpRequest) -> UserOut:
    db = database.get_db()

    existing = await db.users.find_one({"email": body.email})
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered.")

    hashed = bcrypt.hashpw(body.password.encode(), bcrypt.gensalt(rounds=12))

    doc = {
        "prenom": body.prenom,
        "nom": body.nom,
        "email": body.email,
        "password_hash": hashed.decode(),
        "tel": body.tel,
        "age": body.age,
        "niveauScolaire": body.niveauScolaire,
        "specialty": body.specialty,
        "role": "student",
        "created_at": datetime.now(timezone.utc),
    }
    result = await db.users.insert_one(doc)

    return UserOut(
        id=str(result.inserted_id),
        prenom=body.prenom,
        nom=body.nom,
        email=body.email,
        tel=body.tel,
        age=body.age,
        niveauScolaire=body.niveauScolaire,
        specialty=body.specialty,
        role="student",
    )


async def signin_user(body: SignInRequest) -> UserOut:
    db = database.get_db()

    user = await db.users.find_one({"email": body.email})

    # Use constant-time comparison even when user not found (prevent timing attacks)
    dummy_hash = bcrypt.hashpw(b"dummy_password_for_timing", bcrypt.gensalt(rounds=4))
    stored_hash = user["password_hash"].encode() if user else dummy_hash
    password_ok = bcrypt.checkpw(body.password.encode(), stored_hash)

    if not user or not password_ok:
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    return UserOut(
        id=str(user["_id"]),
        prenom=user["prenom"],
        nom=user["nom"],
        email=user["email"],
        tel=user.get("tel", ""),
        age=user.get("age", 0),
        niveauScolaire=user.get("niveauScolaire", ""),
        specialty=user.get("specialty", ""),
        role=user.get("role", "student"),
    )


async def seed_admin() -> dict:
    """Create the admin user if it does not already exist."""
    db = database.get_db()
    existing = await db.users.find_one({"email": _ADMIN_EMAIL})
    if existing:
        return {"status": "exists", "email": _ADMIN_EMAIL}

    hashed = bcrypt.hashpw(_ADMIN_PASSWORD.encode(), bcrypt.gensalt(rounds=12))
    doc = {
        "prenom": "Admin",
        "nom": "AcademIA",
        "email": _ADMIN_EMAIL,
        "password_hash": hashed.decode(),
        "tel": "",
        "age": 0,
        "niveauScolaire": "lycee",
        "specialty": "",
        "role": "admin",
        "created_at": datetime.now(timezone.utc),
    }
    await db.users.insert_one(doc)
    return {"status": "created", "email": _ADMIN_EMAIL}
