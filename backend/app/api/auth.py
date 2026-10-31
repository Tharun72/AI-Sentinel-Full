from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.core.security import create_access_token
from app.database.database import get_db
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse
from app.schemas.user import UserResponse
from app.services.audit_service import record_audit_event
from app.services.auth_service import authenticate_user, create_user, get_user_by_email


router = APIRouter(prefix="/auth", tags=["Authentication"])


def _token_for_user(db: Session, user) -> dict[str, str]:
    record_audit_event(
        db,
        event_type="authentication.login_succeeded",
        resource_type="user",
        resource_id=user.id,
        actor_id=user.id,
    )
    db.commit()
    return {
        "access_token": create_access_token({"sub": str(user.id), "email": user.email}),
        "token_type": "bearer",
    }


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(request: RegisterRequest, db: Session = Depends(get_db)):
    if get_user_by_email(db, request.email):
        raise HTTPException(status_code=400, detail="Email already registered")
    try:
        user = create_user(
            db=db,
            full_name=request.full_name.strip(),
            email=request.email,
            password=request.password,
            commit=False,
        )
        record_audit_event(
            db,
            event_type="authentication.registered",
            resource_type="user",
            resource_id=user.id,
            actor_id=user.id,
        )
        db.commit()
        db.refresh(user)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail="Email already registered") from exc
    return user


@router.post("/login", response_model=TokenResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = authenticate_user(db=db, email=request.email, password=request.password)
    if not user:
        # Do not log submitted email/password or reveal which credential failed.
        record_audit_event(
            db,
            event_type="authentication.login_failed",
            resource_type="authentication",
            outcome="failure",
        )
        db.commit()
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return _token_for_user(db, user)


@router.post("/token", response_model=TokenResponse)
def token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = authenticate_user(db=db, email=form_data.username, password=form_data.password)
    if not user:
        record_audit_event(
            db,
            event_type="authentication.login_failed",
            resource_type="authentication",
            outcome="failure",
        )
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return _token_for_user(db, user)


@router.get("/me", response_model=UserResponse)
def get_me(current_user=Depends(get_current_user)):
    return current_user
