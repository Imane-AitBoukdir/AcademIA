from fastapi import APIRouter
from .models import SignUpRequest, SignInRequest, UserOut
from .service import signup_user, signin_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/signup", response_model=UserOut, status_code=201)
async def signup(body: SignUpRequest):
    return await signup_user(body)


@router.post("/signin", response_model=UserOut)
async def signin(body: SignInRequest):
    return await signin_user(body)
