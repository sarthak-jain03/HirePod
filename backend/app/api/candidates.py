from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session

from ..database import get_db
from .. import models, schemas, crud
from ..deps import get_current_user, require_role
from ..services import parsing, scoring

router = APIRouter(prefix="/api/candidates", tags=["candidates"])


@router.post("/bulk-upload")
def bulk_upload(
    requisition_id: int = Form(...),
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(models.UserRole.recruiter, models.UserRole.delivery_head)),
):
    req = crud.get_requisition(db, requisition_id)
    if not req:
        raise HTTPException(status_code=404, detail="Requisition not found")
    if len(files) > 500:
        raise HTTPException(status_code=400, detail="Maximum 500 files per upload")

    results = []
    seen_keys = set()
    for upload in files:
        content = upload.file.read()
        ext = (upload.filename or "").lower()
        note = ""
        text = ""

        if ext.endswith(".pdf"):
            text, is_scanned, note = parsing.extract_text_from_pdf(content)
        elif ext.endswith(".docx"):
            text, note = parsing.extract_text_from_docx(content)
        else:
            results.append({"file": upload.filename, "error": "Only PDF and DOCX are supported"})
            continue

        if not text:
            results.append({"file": upload.filename, "error": note or "No text extracted"})
            continue

        profile = parsing.parse_cv_text(text)
        profile["candidate_id"] = f"CND-{abs(hash(upload.filename + str(len(content)))) % 100000:05d}"

        # Duplicate detection by email / phone
        dup = None
        key_email = parsing.normalize_email(profile.get("email"))
        key_phone = parsing.normalize_phone(profile.get("phone"))
        if key_email:
            dup = db.query(models.Candidate).filter(models.Candidate.email == key_email).first()
        if not dup and key_phone:
            dup = db.query(models.Candidate).filter(models.Candidate.phone == key_phone).first()

        if dup:
            results.append({
                "file": upload.filename,
                "duplicate": True,
                "candidate_id": dup.candidate_id,
                "name": dup.name,
                "note": note or "Parsed",
            })
            continue

        candidate = crud.create_candidate(db, profile, source_file=upload.filename)
        crud.set_consent(db, candidate.id, True, granted_by=current_user.email)
        # Auto-link candidate to this requisition as "sourced"
        existing_app = (db.query(models.Application)
                        .filter(models.Application.requisition_id == requisition_id,
                                models.Application.candidate_id == candidate.id)
                        .first())
        if not existing_app:
            crud.create_application(db, requisition_id=requisition_id,
                                    candidate_id=candidate.id, status="sourced")
        results.append({
            "file": upload.filename,
            "candidate_id": candidate.candidate_id,
            "name": candidate.name,
            "email": candidate.email,
            "phone": candidate.phone,
            "current_role": candidate.current_role,
            "experience_years": candidate.experience_years,
            "key_skills": candidate.key_skills,
            "notice_days": candidate.notice_days,
            "note": note or "Parsed",
        })

    return {"uploaded": len(results), "results": results}


@router.post("/demo-batch")
def load_demo_batch(
    requisition_id: int = Form(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Seed a realistic batch of candidates across Company A's domains (IT Services, Banking KYC, Retail Back-office) with duplicate detection."""
    req = crud.get_requisition(db, requisition_id)
    if not req:
        raise HTTPException(status_code=404, detail="Requisition not found")

    demo_profiles = [
        {
            "name": "Vikas Sharma",
            "email": "vikas.sharma@example.in",
            "phone": "+91 98234 11223",
            "current_role": "Lead Java Engineer",
            "experience_years": "7.5",
            "key_skills": ["Java", "Spring Boot", "microservices", "Docker", "Kubernetes", "AWS"],
            "notice_days": 30,
            "location": "Noida",
            "file": "vikas_sharma_lead_java.pdf",
        },
        {
            "name": "Sneha Gupta",
            "email": "sneha.gupta@example.in",
            "phone": "+91 98111 22334",
            "current_role": "Full Stack Java Developer",
            "experience_years": "5.0",
            "key_skills": ["Java", "Spring Boot", "REST APIs", "React", "PostgreSQL"],
            "notice_days": 45,
            "location": "Delhi NCR",
            "file": "sneha_gupta_fullstack.docx",
        },
        {
            "name": "Amit Verma",
            "email": "amit.verma@example.in",
            "phone": "+91 97123 44556",
            "current_role": "Retail Operations & SQL Specialist",
            "experience_years": "4.0",
            "key_skills": ["SQL", "Excel", "Retail Operations", "SAP"],
            "notice_days": 15,
            "location": "Noida",
            "file": "amit_verma_retail.pdf",
        },
        {
            "name": "Priya Deshmukh",
            "email": "priya.deshmukh@example.in",
            "phone": "+91 98765 99887",
            "current_role": "Senior KYC / AML Analyst",
            "experience_years": "6.0",
            "key_skills": ["KYC", "AML checks", "Excel", "Compliance", "Banking Back-office"],
            "notice_days": 30,
            "location": "Gurgaon",
            "file": "priya_deshmukh_kyc.pdf",
        },
        # Duplicate test candidate
        {
            "name": "Ritika Bansal",
            "email": "ritika.bansal@seed.demo",
            "phone": "+91 99887 76655",
            "current_role": "Senior Java Developer",
            "experience_years": "6.5",
            "key_skills": ["Java", "Spring Boot", "microservices"],
            "notice_days": 60,
            "location": "Noida",
            "file": "ritika_bansal_updated.pdf",
        },
    ]

    results = []
    for item in demo_profiles:
        filename = item["file"]
        # Duplicate detection by email or phone
        dup = None
        key_email = parsing.normalize_email(item.get("email"))
        key_phone = parsing.normalize_phone(item.get("phone"))
        if key_email:
            dup = db.query(models.Candidate).filter(models.Candidate.email == key_email).first()
        if not dup and key_phone:
            dup = db.query(models.Candidate).filter(models.Candidate.phone == key_phone).first()

        if dup:
            results.append({
                "file": filename,
                "duplicate": True,
                "candidate_id": dup.candidate_id,
                "name": dup.name,
                "note": "Duplicate detected by email/phone &mdash; matched existing profile",
            })
            continue

        cid_num = abs(hash(filename + str(item["email"]))) % 100000
        profile = {
            "candidate_id": f"CND-{cid_num:05d}",
            "name": item["name"],
            "email": item["email"],
            "phone": item["phone"],
            "current_role": item["current_role"],
            "experience_years": item["experience_years"],
            "key_skills": item["key_skills"],
            "notice_days": item["notice_days"],
            "location": item["location"],
        }
        cand = crud.create_candidate(db, profile, source_file=filename)
        crud.set_consent(db, cand.id, True, granted_by=current_user.email)
        # Auto-link candidate to this requisition as "sourced"
        existing_app = (db.query(models.Application)
                        .filter(models.Application.requisition_id == req.id,
                                models.Application.candidate_id == cand.id)
                        .first())
        if not existing_app:
            crud.create_application(db, requisition_id=req.id,
                                    candidate_id=cand.id, status="sourced")
        results.append({
            "file": filename,
            "candidate_id": cand.candidate_id,
            "name": cand.name,
            "email": cand.email,
            "phone": cand.phone,
            "current_role": cand.current_role,
            "experience_years": cand.experience_years,
            "key_skills": cand.key_skills,
            "notice_days": cand.notice_days,
            "note": "Parsed successfully from digital CV",
        })

    return {"uploaded": len(results), "results": results}


@router.get("", response_model=List[schemas.CandidateOut])
@router.get("/", response_model=List[schemas.CandidateOut])
def list_candidates(
    q: Optional[str] = None,
    requisition_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return crud.list_candidates(db, current_user, q=q, requisition_id=requisition_id)


@router.get("/{candidate_id}", response_model=schemas.CandidateOut)
def get_candidate(
    candidate_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    candidate = crud.get_candidate(db, candidate_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    if candidate.deleted_at:
        raise HTTPException(status_code=410, detail="Candidate deleted")
    return candidate


@router.post("/{candidate_id}/consent")
def set_consent(
    candidate_id: int,
    consent: bool,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(models.UserRole.recruiter, models.UserRole.delivery_head)),
):
    updated = crud.set_consent(db, candidate_id, consent, granted_by=current_user.email)
    if not updated:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return {"candidate_id": candidate_id, "consent": consent, "status": updated.consent_status}


@router.delete("/{candidate_id}")
def delete_candidate(
    candidate_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(models.UserRole.recruiter, models.UserRole.delivery_head)),
):
    ok = crud.soft_delete_candidate(db, candidate_id, current_user)
    if not ok:
        raise HTTPException(status_code=404, detail="Candidate not found or already deleted")
    return {"candidate_id": candidate_id, "deleted": True}
