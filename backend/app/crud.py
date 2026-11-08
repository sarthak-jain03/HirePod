import re
import json
from datetime import datetime
from typing import List, Optional, Tuple

from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, func, desc

from . import models
from . import schemas
from . import security
from .services.parsing import _extract_skills


# ---------------- Users ----------------

def get_user_by_email(db: Session, email: str) -> Optional[models.User]:
    return db.query(models.User).filter(models.User.email == email).first()


def create_user(db: Session, user_in: schemas.UserCreate) -> models.User:
    user = models.User(
        email=user_in.email,
        password_hash=security.hash_password(user_in.password),
        role=user_in.role,
        company=user_in.company,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def authenticate_user(db: Session, email: str, password: str) -> Optional[models.User]:
    user = get_user_by_email(db, email)
    if not user or not security.verify_password(password, user.password_hash):
        return None
    return user


def audit(db: Session, actor: Optional[models.User], action: str, target_type: Optional[str] = None,
          target_id: Optional[str] = None, details: Optional[dict] = None) -> None:
    entry = models.AuditLog(
        actor_id=actor.id if actor else None,
        action=action,
        target_type=target_type,
        target_id=target_id,
        details=details or {},
    )
    db.add(entry)
    db.commit()


# ---------------- Requisitions ----------------

def create_requisition(db: Session, requisition_in: schemas.RequisitionCreate, creator: models.User) -> models.Requisition:
    target_client_id = requisition_in.client_id
    if target_client_id is None:
        client_user = db.query(models.User).filter(models.User.role == models.UserRole.client_manager).first()
        if client_user:
            target_client_id = client_user.id

    req = models.Requisition(
        title=requisition_in.title,
        description=requisition_in.description,
        location=requisition_in.location,
        experience_min=requisition_in.experience_min,
        experience_max=requisition_in.experience_max,
        ctc_lakhs=requisition_in.ctc_lakhs,
        notice_period_days=requisition_in.notice_period_days,
        must_have_skills=requisition_in.must_have_skills or [],
        nice_to_have_skills=requisition_in.nice_to_have_skills or [],
        client_id=target_client_id,
        created_by=creator.id,
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    return req


def _attach_requisition_counts(db: Session, req: models.Requisition) -> models.Requisition:
    if not req:
        return req
    req.application_count = db.query(models.Application).filter(models.Application.requisition_id == req.id).count()
    req.shortlisted_count = db.query(models.Application).filter(
        models.Application.requisition_id == req.id,
        models.Application.status == models.ApplicationStatus.shortlisted
    ).count()
    return req


def get_requisition(db: Session, requisition_id: int) -> Optional[models.Requisition]:
    req = db.query(models.Requisition).filter(models.Requisition.id == requisition_id).first()
    if req:
        _attach_requisition_counts(db, req)
    return req


def list_requisitions(db: Session, user: models.User, status: Optional[str] = None) -> List[models.Requisition]:
    q = db.query(models.Requisition)
    if user.role == models.UserRole.client_manager:
        q = q.filter(models.Requisition.client_id == user.id)
    if status:
        q = q.filter(models.Requisition.status == status)
    reqs = q.order_by(desc(models.Requisition.created_at)).all()
    for r in reqs:
        _attach_requisition_counts(db, r)
    return reqs


def update_requisition(db: Session, requisition_id: int, requisition_in: schemas.RequisitionUpdate) -> Optional[models.Requisition]:
    req = get_requisition(db, requisition_id)
    if not req:
        return None
    data = requisition_in.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(req, field, value)
    db.commit()
    db.refresh(req)
    return req


# ---------------- JD scorecard extraction ----------------

def extract_scorecard_from_jd(jd_text: str, ai) -> dict:
    """Extract an editable scorecard from a raw JD using AI, with heuristic fallback."""
    prompt = (
        "Extract a hiring scorecard from this job description. Return ONLY JSON:\n"
        "{\"must_have_skills\": [str], \"nice_to_have_skills\": [str], \"experience_min\": int|null, "
        "\"experience_max\": int|null, \"ctc_lakhs\": str|null, \"notice_period_days\": int|null, "
        "\"location\": str|null, \"raw_summary\": str}\n"
        f"\nJD:\n{jd_text[:4000]}"
    )
    try:
        if getattr(ai, "mode", None) == "real" and getattr(ai, "client", None):
            from .config import GROQ_MODEL
            model = getattr(ai, "model", GROQ_MODEL)
            completion = ai.client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.2,
                response_format={"type": "json_object"},
                timeout=20.0,
            )
            content = completion.choices[0].message.content or "{}"
            start = content.index("{"); end = content.rindex("}") + 1
            data = json.loads(content[start:end])
            if not data.get("raw_summary"):
                data["raw_summary"] = f"AI scorecard extracted using Groq ({model})."
            return data
    except Exception:
        pass
    return _heuristic_scorecard(jd_text)


def _heuristic_scorecard(jd_text: str) -> dict:
    skills = _extract_skills(jd_text)
    years = re.findall(r"(\d+)\s*(?:[-–to ]\s*(\d+))?\s*years?", jd_text.lower())
    exp_min = int(years[0][0]) if years else None
    exp_max = int(years[0][1]) if years and years[0][1] else None
    notice = re.search(r"notice\s*(?:period)?\s*[:–-]?\s*(\d+)\s*days?", jd_text, re.IGNORECASE)
    return {
        "must_have_skills": skills[:8],
        "nice_to_have_skills": [],
        "experience_min": exp_min,
        "experience_max": exp_max,
        "ctc_lakhs": None,
        "notice_period_days": int(notice.group(1)) if notice else None,
        "location": None,
        "raw_summary": "Scorecard extracted from JD. Review and edit before use.",
    }


# ---------------- Candidates ----------------

def create_candidate(db: Session, profile: dict, source_file: Optional[str] = None,
                     duplicate_of: Optional[int] = None) -> models.Candidate:
    candidate = models.Candidate(
        candidate_id=profile.get("candidate_id") or f"CND-{abs(hash(source_file or '')) % 100000:05d}",
        name=profile.get("name") or "Unknown",
        email=profile.get("email"),
        phone=profile.get("phone"),
        current_role=profile.get("current_role"),
        experience_years=profile.get("experience_years"),
        key_skills=profile.get("key_skills") or [],
        notice_days=profile.get("notice_days"),
        location=profile.get("location"),
        parsed_profile=profile,
        source_file=source_file,
        duplicate_of=duplicate_of,
    )
    db.add(candidate)
    db.commit()
    db.refresh(candidate)
    return candidate


def get_candidate(db: Session, candidate_id: int) -> Optional[models.Candidate]:
    return db.query(models.Candidate).filter(models.Candidate.id == candidate_id).first()


def get_candidate_by_id_str(db: Session, candidate_id_str: str) -> Optional[models.Candidate]:
    return db.query(models.Candidate).filter(models.Candidate.candidate_id == candidate_id_str).first()


def list_candidates(db: Session, user: models.User, q: Optional[str] = None,
                    requisition_id: Optional[int] = None) -> List[models.Candidate]:
    query = db.query(models.Candidate).filter(models.Candidate.deleted_at.is_(None))
    if requisition_id:
        query = query.join(models.Application).filter(models.Application.requisition_id == requisition_id)
    if q:
        like = f"%{q}%"
        query = query.filter(
            or_(
                models.Candidate.name.ilike(like),
                models.Candidate.candidate_id.ilike(like),
                models.Candidate.current_role.ilike(like),
                models.Candidate.location.ilike(like),
            )
        )
    return query.order_by(desc(models.Candidate.id)).all()


def soft_delete_candidate(db: Session, candidate_id: int, actor: models.User) -> bool:
    candidate = get_candidate(db, candidate_id)
    if not candidate or candidate.deleted_at:
        return False
    candidate.deleted_at = datetime.utcnow()
    db.commit()
    audit(db, actor, "candidate_delete", "candidate", str(candidate_id), {"name": candidate.name})
    return True


def set_consent(db: Session, candidate_id: int, consent: bool, granted_by: Optional[str] = None) -> Optional[models.Candidate]:
    candidate = get_candidate(db, candidate_id)
    if not candidate:
        return None
    candidate.consent = consent
    if consent:
        candidate.consent_status = models.ConsentStatus.given
        candidate.consent_at = datetime.utcnow()
    else:
        candidate.consent_status = models.ConsentStatus.withdrawn
        candidate.consent_at = None
    db.commit()
    db.refresh(candidate)
    audit(db, None, "consent_change", "candidate", str(candidate_id), {"consent": consent, "granted_by": granted_by})
    return candidate


def log_view(db: Session, candidate_id: int, viewer: models.User, requisition_id: Optional[int] = None) -> None:
    entry = models.CandidateViewLog(
        candidate_id=candidate_id,
        viewer_id=viewer.id,
        requisition_id=requisition_id,
    )
    db.add(entry)
    db.commit()


# ---------------- Applications ----------------

def create_application(db: Session, requisition_id: int, candidate_id: int, status: str,
                       submitted_by: Optional[int] = None, notes: Optional[str] = None,
                       ai_result: Optional[dict] = None) -> models.Application:
    app = models.Application(
        requisition_id=requisition_id,
        candidate_id=candidate_id,
        status=status,
        submitted_by=submitted_by,
        recruiter_notes=notes,
    )
    if ai_result:
        app.ai_score = ai_result.get("total_score")
        app.ai_breakdown = ai_result.get("breakdown")
        app.ai_evidence = {b["criterion"]: b.get("evidence", []) for b in ai_result.get("breakdown", [])}
        app.ai_reasoning = ai_result.get("reasoning")
    if submitted_by:
        app.submitted_at = datetime.utcnow()
    db.add(app)
    db.commit()
    db.refresh(app)
    return app


def get_application(db: Session, application_id: int) -> Optional[models.Application]:
    return db.query(models.Application).filter(models.Application.id == application_id).first()


def list_applications(db: Session, requisition_id: int) -> List[models.Application]:
    return (db.query(models.Application)
            .options(joinedload(models.Application.candidate))
            .filter(models.Application.requisition_id == requisition_id)
            .order_by(desc(models.Application.created_at))
            .all())


def update_application(db: Session, application_id: int, **fields) -> Optional[models.Application]:
    app = get_application(db, application_id)
    if not app:
        return None
    for field, value in fields.items():
        setattr(app, field, value)
    db.commit()
    db.refresh(app)
    return app


# ---------------- Pipeline ----------------

def pipeline_counts(db: Session, requisition_id: int) -> dict:
    rows = (db.query(models.Application.status, func.count(models.Application.id))
            .filter(models.Application.requisition_id == requisition_id)
            .group_by(models.Application.status)
            .all())
    return {status: count for status, count in rows}
