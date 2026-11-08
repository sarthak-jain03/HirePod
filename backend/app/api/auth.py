from fastapi import APIRouter, Depends, HTTPException, status, Form
from sqlalchemy.orm import Session

from ..database import get_db
from .. import models, schemas, security, crud
from ..deps import get_current_user, require_role

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=schemas.UserOut)
def register(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    if crud.get_user_by_email(db, user_in.email):
        raise HTTPException(status_code=400, detail="Email already registered")
    return crud.create_user(db, user_in)


@router.post("/token")
def login(email: str = Form(...), password: str = Form(...), db: Session = Depends(get_db)):
    user = crud.authenticate_user(db, email, password)
    if not user:
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    token = security.create_access_token(data={"sub": user.email})
    return {"access_token": token, "token_type": "bearer"}


@router.get("/me", response_model=schemas.UserOut)
def me(current_user: models.User = Depends(get_current_user)):
    return current_user


@router.post("/switch-role/{target_role}")
def switch_role(target_role: str, db: Session = Depends(get_db)):
    role_map = {
        "recruiter": "recruiter@hirepod.demo",
        "client_manager": "client@hirepod.demo",
        "client": "client@hirepod.demo",
        "delivery_head": "delivery@hirepod.demo",
        "delivery": "delivery@hirepod.demo",
    }
    email = role_map.get(target_role.lower())
    if not email:
        raise HTTPException(status_code=400, detail="Unknown role. Use recruiter, client_manager, or delivery_head")
    user = crud.get_user_by_email(db, email)
    if not user:
        # Create if missing
        role_enum = models.UserRole.client_manager if "client" in target_role else models.UserRole.delivery_head if "delivery" in target_role else models.UserRole.recruiter
        user = crud.create_user(db, schemas.UserCreate(email=email, password="password", role=role_enum, company="Company A"))
    token = security.create_access_token(data={"sub": user.email})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "role": user.role.value if hasattr(user.role, "value") else str(user.role),
            "company": user.company,
        }
    }
