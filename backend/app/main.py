from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import engine, Base, SessionLocal
from . import models
from .api import auth, jds, candidates, applications, audit
from .crud import create_user, get_user_by_email
from .schemas import UserCreate

Base.metadata.create_all(bind=engine)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup seed
    db = SessionLocal()
    try:
        if not get_user_by_email(db, "recruiter@hirepod.demo"):
            create_user(db, UserCreate(email="recruiter@hirepod.demo", password="password",
                                       role="recruiter", company="Company A"))
        if not get_user_by_email(db, "client@hirepod.demo"):
            create_user(db, UserCreate(email="client@hirepod.demo", password="password",
                                       role="client_manager", company="Company A"))
        if not get_user_by_email(db, "delivery@hirepod.demo"):
            create_user(db, UserCreate(email="delivery@hirepod.demo", password="password",
                                       role="delivery_head", company="Company A"))
    finally:
        db.close()
    yield


app = FastAPI(title="HirePod - Recruitment Screening Platform", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(jds.router)
app.include_router(candidates.router)
app.include_router(applications.router)
app.include_router(audit.router)


@app.get("/health")
def health():
    return {"status": "ok"}
