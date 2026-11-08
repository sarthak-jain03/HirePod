"""Seed sample data: requisitions + candidates from the assignment sample data."""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal, engine
from app import models, crud, security
from app.schemas import UserCreate, RequisitionCreate

Base = models.Base
Base.metadata.create_all(bind=engine)


def main():
    db = SessionLocal()
    # users
    users = {
        "recruiter@hirepod.demo": ("recruiter", "recruiter@hirepod.demo"),
        "client@hirepod.demo": ("client_manager", "client@hirepod.demo"),
        "delivery@hirepod.demo": ("delivery_head", "delivery@hirepod.demo"),
    }
    for email, (role, company) in users.items():
        if not crud.get_user_by_email(db, email):
            crud.create_user(db, UserCreate(email=email, password="password", role=role, company="Company A"))

    recruiter = crud.get_user_by_email(db, "recruiter@hirepod.demo")
    client = crud.get_user_by_email(db, "client@hirepod.demo")

    # requisition from example JD
    jd = """Senior Java Developer
Location: Noida
Experience: 5-8 years
Must-have skills: Java, Spring Boot, microservices, REST APIs
Notice: up to 60 days
CTC: up to 18 lakhs"""
    req = crud.create_requisition(
        db,
        RequisitionCreate(
            title="Senior Java Developer",
            description=jd,
            location="Noida",
            experience_min=5,
            experience_max=8,
            ctc_lakhs="18",
            notice_period_days=60,
            must_have_skills=["Java", "Spring Boot", "microservices", "REST APIs"],
            nice_to_have_skills=["Hibernate", "Kafka", "AWS"],
            client_id=client.id,
        ),
        recruiter,
    )

    candidates = [
        {"candidate_id": "CND-91022", "name": "Ritika Bansal", "current_role": "Senior Java Developer",
         "experience_years": "6.5", "key_skills": ["Java", "Spring Boot", "microservices"], "notice_days": 60},
        {"candidate_id": "CND-91047", "name": "Arjun Rawat", "current_role": "KYC Analyst",
         "experience_years": "3.0", "key_skills": ["KYC", "AML checks", "Excel"], "notice_days": 30},
        {"candidate_id": "CND-91088", "name": "Pooja Nair", "current_role": "Java Developer",
         "experience_years": "4.0", "key_skills": ["Java", "Hibernate", "REST APIs"], "notice_days": 90},
    ]
    for profile in candidates:
        existing = crud.get_candidate_by_id_str(db, profile["candidate_id"])
        if not existing:
            cand = crud.create_candidate(db, profile, source_file="seed_data.csv")
            crud.set_consent(db, cand.id, True, granted_by="seed")
            # submit to the requisition so it shows in pipeline
            from app.services import scoring
            svc = scoring.ScoringService()
            criteria = [{"name": s, "weight": 1.0, "required": True} for s in ["Java", "Spring Boot", "microservices", "REST APIs"]]
            criteria.append({"name": "Experience 5-8 years", "weight": 1.2, "required": True})
            criteria.append({"name": "Notice up to 60 days", "weight": 0.8, "required": False})
            result = svc.score_cv(
                " ".join(profile["key_skills"]) + " " + profile["current_role"] + " " + profile["experience_years"] + " years",
                criteria,
            )
            crud.log_view(db, cand.id, recruiter, req.id)
            crud.create_application(
                db, requisition_id=req.id, candidate_id=cand.id, status="shortlisted",
                submitted_by=recruiter.id, ai_result=result,
            )

    db.commit()
    print(f"Seeded requisition {req.title} (id={req.id}) with {len(candidates)} candidates")
    print("Demo login: recruiter@hirepod.demo / client@hirepod.demo / delivery@hirepod.demo (password: password)")


if __name__ == "__main__":
    main()
