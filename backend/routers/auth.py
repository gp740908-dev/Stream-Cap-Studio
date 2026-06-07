"""
StreamCap Studio — Auth Router
JWT-based credential login for single-user / small team setup.
Endpoint: POST /api/auth/login → returns JWT access token
"""
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext

from config import get_settings
from schemas import LoginRequest, TokenResponse

router = APIRouter(prefix="/api/auth", tags=["auth"])
settings = get_settings()

# Password hashing context — uses bcrypt
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 scheme — token is sent as Bearer in Authorization header
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def _verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def _create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    payload = data.copy()
    expire = datetime.utcnow() + (
        expires_delta or timedelta(minutes=settings.access_token_expire_minutes)
    )
    payload.update({"exp": expire})
    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)


async def get_current_user(token: str = Depends(oauth2_scheme)) -> str:
    """FastAPI dependency — validates JWT and returns the username."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    return username


@router.post("/login", response_model=TokenResponse)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """
    Authenticate with username + password.
    Returns a JWT access token valid for ACCESS_TOKEN_EXPIRE_MINUTES.
    """
    # Compare against admin credentials from env
    # In a multi-user setup this would query a users table
    if (
        form_data.username != settings.admin_username
        or form_data.password != settings.admin_password
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = _create_access_token(data={"sub": form_data.username})
    return TokenResponse(access_token=access_token)


@router.get("/me")
async def get_me(current_user: str = Depends(get_current_user)):
    """Return the authenticated username — useful for frontend token validation."""
    return {"username": current_user}
