from sqlalchemy.orm import Session

from app.models.user import User
from app.utils.security import hash_password, verify_password


def get_user_by_email(db: Session, email: str):
    normalized_email = email.strip().lower()
    return db.query(User).filter(User.email == normalized_email).first()


def create_user(db: Session, full_name: str, email: str, password: str, *, commit: bool = True):
    user = User(full_name=full_name, email=email.strip().lower(), hashed_password=hash_password(password))
    try:
        db.add(user)
        if commit:
            db.commit()
            db.refresh(user)
        else:
            db.flush()
    except Exception:
        db.rollback()
        raise
    return user


def authenticate_user(db: Session, email: str, password: str):
    user = get_user_by_email(db, email)
    if not user or not verify_password(password, user.hashed_password):
        return None
    return user
