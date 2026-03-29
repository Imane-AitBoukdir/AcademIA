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
    )


async def signin_user(body: SignInRequest) -> UserOut:
    db = database.get_db()

    user = await db.users.find_one({"email": body.email})

    # Use constant-time comparison even when user not found (prevent timing attacks)
    dummy_hash = b"$2b$12$invalidhashforthisuserthatdoesnotexistXXXXXXXXXXXXXXXXXXXX"
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
    )
