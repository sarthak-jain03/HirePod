from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import engine, Base, SessionLocal
from . import models
from .api import auth, jds, candidates, applications, audit
from .crud import create_user, get_user_by_email
from .schemas import UserCreate

def init_seed():
    """Ensure database tables and initial demo users/sample data exist."""
    try:
        Base.metadata.create_all(bind=engine)
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
            
            # If no requisitions exist (e.g. fresh Vercel /tmp DB), seed the sample JD and candidates
            if db.query(models.Requisition).count() == 0:
                recruiter = get_user_by_email(db, "recruiter@hirepod.demo")
                client = get_user_by_email(db, "client@hirepod.demo")
                from .schemas import RequisitionCreate
                from . import crud
                req = crud.create_requisition(
                    db,
                    RequisitionCreate(
                        title="Senior Java Developer",
                        description="Senior Java Developer\nLocation: Noida\nExperience: 5-8 years\nMust-have skills: Java, Spring Boot, microservices, REST APIs\nNotice: up to 60 days\nCTC: up to 18 lakhs",
                        location="Noida",
                        experience_min=5,
                        experience_max=8,
                        ctc_lakhs="18",
                        notice_period_days=60,
                        must_have_skills=["Java", "Spring Boot", "microservices", "REST APIs"],
                        nice_to_have_skills=["Hibernate", "Kafka", "AWS"],
                        client_id=client.id if client else None,
                    ),
                    recruiter,
                )
                sample_cands = [
                    {"candidate_id": "CND-91022", "name": "Ritika Bansal", "current_role": "Senior Java Developer",
                     "experience_years": "6.5", "key_skills": ["Java", "Spring Boot", "microservices"], "notice_days": 60, "location": "Noida"},
                    {"candidate_id": "CND-91047", "name": "Arjun Rawat", "current_role": "KYC Analyst",
                     "experience_years": "3.0", "key_skills": ["KYC", "AML checks", "Excel"], "notice_days": 30, "location": "Delhi NCR"},
                    {"candidate_id": "CND-91088", "name": "Pooja Nair", "current_role": "Java Developer",
                     "experience_years": "4.0", "key_skills": ["Java", "Hibernate", "REST APIs"], "notice_days": 90, "location": "Noida"},
                ]
                for p in sample_cands:
                    c = crud.create_candidate(db, p, source_file="sample_cvs.pdf")
                    crud.set_consent(db, c.id, True, granted_by="demo_seed")
                    crud.create_application(db, requisition_id=req.id, candidate_id=c.id, status="shortlisted", submitted_by=recruiter.id)
                    crud.log_view(db, c.id, recruiter, req.id)
            db.commit()
        finally:
            db.close()
    except Exception as e:
        print(f"init_seed note: {e}")

init_seed()


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_seed()
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
@app.get("/api/health")
def health():
    return {"status": "ok"}
