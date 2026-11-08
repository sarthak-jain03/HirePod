from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from .. import models, schemas, crud
from ..deps import get_current_user, require_role
from ..services import scoring

router = APIRouter(prefix="/api/applications", tags=["applications"])


def _mask_contact(value: Optional[str], kind: str) -> Optional[str]:
    if not value:
        return None
    if kind == "email":
        local, _, domain = value.partition("@")
        return (local[0] + "****@" + domain) if local else "****@" + domain
    digits = "".join(ch for ch in value if ch.isdigit())
    return ("****" + digits[-4:]) if len(digits) >= 4 else "****"


@router.post("/score/{requisition_id}", response_model=List[schemas.CVScoreOut])
def score_requisition(
    requisition_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(models.UserRole.recruiter, models.UserRole.delivery_head)),
):
    req = crud.get_requisition(db, requisition_id)
    if not req:
        raise HTTPException(status_code=404, detail="Requisition not found")

    criteria = [
        {"name": s, "weight": 1.0, "required": True} for s in (req.must_have_skills or [])
    ]
    if req.experience_min is not None or req.experience_max is not None:
        criteria.append({
            "name": f"Experience {req.experience_min or 0}-{req.experience_max or 10} years",
            "weight": 1.2, "required": True,
        })
    if req.notice_period_days is not None:
        criteria.append({"name": f"Notice up to {req.notice_period_days} days", "weight": 0.8, "required": False})
    if req.ctc_lakhs:
        criteria.append({"name": f"CTC around {req.ctc_lakhs} lakhs", "weight": 0.8, "required": False})

    svc = scoring.ScoringService()
    candidates = crud.list_candidates(db, current_user)
    results = []
    for cand in candidates:
        cv_text = ""
        if cand.parsed_profile:
            cv_text = "\n".join(str(v) for v in cand.parsed_profile.values() if v)
        if not cv_text:
            cv_text = f"{cand.name or ''} {cand.current_role or ''} {' '.join(cand.key_skills or [])}"

        result = svc.score_cv(cv_text, criteria)
        results.append(schemas.CVScoreOut(
            id=cand.id,
            candidate_id=cand.candidate_id,
            name=cand.name,
            current_role=cand.current_role,
            experience_years=cand.experience_years,
            key_skills=cand.key_skills,
            notice_days=cand.notice_days,
            total_score=result.get("total_score", 0),
            breakdown=result.get("breakdown", []),
            reasoning=result.get("reasoning", ""),
            file_name=cand.source_file,
        ))

    results.sort(key=lambda r: r.total_score, reverse=True)
    return results


@router.get("/{requisition_id}/ranked", response_model=List[schemas.CVScoreOut])
@router.get("/ranked/{requisition_id}", response_model=List[schemas.CVScoreOut])
def ranked_list(
    requisition_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    req = crud.get_requisition(db, requisition_id)
    if not req:
        raise HTTPException(status_code=404, detail="Requisition not found")
    if current_user.role == models.UserRole.client_manager and req.client_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your client requisition")
    # Reuse scoring logic
    criteria = [
        {"name": s, "weight": 1.0, "required": True} for s in (req.must_have_skills or [])
    ]
    if req.experience_min is not None or req.experience_max is not None:
        criteria.append({"name": f"Experience {req.experience_min or 0}-{req.experience_max or 10} years", "weight": 1.2, "required": True})
    if req.notice_period_days is not None:
        criteria.append({"name": f"Notice up to {req.notice_period_days} days", "weight": 0.8, "required": False})
    if req.ctc_lakhs:
        criteria.append({"name": f"CTC around {req.ctc_lakhs} lakhs", "weight": 0.8, "required": False})

    svc = scoring.ScoringService()
    candidates = crud.list_candidates(db, current_user, requisition_id=requisition_id)
    results = []
    for cand in candidates:
        cv_text = ""
        if cand.parsed_profile:
            cv_text = "\n".join(str(v) for v in cand.parsed_profile.values() if v)
        result = svc.score_cv(cv_text, criteria)
        results.append(schemas.CVScoreOut(
            id=cand.id,
            candidate_id=cand.candidate_id,
            name=cand.name,
            current_role=cand.current_role,
            experience_years=cand.experience_years,
            key_skills=cand.key_skills,
            notice_days=cand.notice_days,
            total_score=result.get("total_score", 0),
            breakdown=result.get("breakdown", []),
            reasoning=result.get("reasoning", ""),
            file_name=cand.source_file,
        ))
    results.sort(key=lambda r: r.total_score, reverse=True)
    return results


@router.post("/open/{candidate_id}")
def open_cv(
    candidate_id: int,
    requisition_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Recruiter opens a CV before submitting it. Logged for audit (DPDP view log)."""
    candidate = crud.get_candidate(db, candidate_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    crud.log_view(db, candidate_id, current_user, requisition_id)
    return {"candidate_id": candidate_id, "opened": True}


@router.post("", response_model=schemas.ApplicationOut)
@router.post("/", response_model=schemas.ApplicationOut)
def create_application(
    app_in: schemas.ApplicationCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(models.UserRole.recruiter, models.UserRole.delivery_head)),
):
    cand = crud.get_candidate(db, app_in.candidate_id)
    if not cand or cand.deleted_at:
        raise HTTPException(status_code=404, detail="Candidate not found")
    if not cand.consent:
        raise HTTPException(status_code=400, detail="Candidate consent not recorded")
    req = crud.get_requisition(db, app_in.requisition_id)
    if not req:
        raise HTTPException(status_code=404, detail="Requisition not found")
    # A recruiter must open the CV before submitting it
    viewed = (db.query(models.CandidateViewLog)
              .filter(models.CandidateViewLog.candidate_id == app_in.candidate_id,
                      models.CandidateViewLog.viewer_id == current_user.id,
                      models.CandidateViewLog.requisition_id == app_in.requisition_id)
              .first())
    if not viewed:
        raise HTTPException(status_code=400, detail="Open the CV before submitting it to the client")

    existing = (db.query(models.Application)
                .filter(models.Application.requisition_id == app_in.requisition_id,
                        models.Application.candidate_id == app_in.candidate_id)
                .first())
    if existing:
        raise HTTPException(status_code=400, detail="Candidate already submitted for this requisition")

    application = crud.create_application(
        db, requisition_id=app_in.requisition_id, candidate_id=app_in.candidate_id,
        status=app_in.status, submitted_by=current_user.id, notes=app_in.recruiter_notes,
    )
    return application


@router.get("/requisition/{requisition_id}", response_model=List[schemas.ApplicationOut])
def list_applications(
    requisition_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    req = crud.get_requisition(db, requisition_id)
    if not req:
        raise HTTPException(status_code=404, detail="Requisition not found")
    if current_user.role == models.UserRole.client_manager and req.client_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your client requisition")
    return crud.list_applications(db, requisition_id)


@router.post("/{application_id}/decision")
def client_decision(
    application_id: int,
    decision_in: schemas.ClientDecision,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(models.UserRole.client_manager, models.UserRole.recruiter, models.UserRole.delivery_head)),
):
    app = crud.get_application(db, application_id)
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    req = crud.get_requisition(db, app.requisition_id)
    if current_user.role == models.UserRole.client_manager and req.client_id and req.client_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your client requisition")
    app = crud.update_application(
        db, application_id,
        client_decision=decision_in.decision,
        client_decision_reason=decision_in.reason,
        interview_slot_proposed=decision_in.interview_slot,
        status={"shortlisted": "shortlisted", "rejected": "rejected", "interview_proposed": "interviewed"}.get(
            decision_in.decision, app.status
        ),
    )
    crud.audit(db, current_user, "client_decision", "application", str(application_id),
               {"decision": decision_in.decision, "reason": decision_in.reason})
    return {"application_id": application_id, "decision": decision_in.decision}


@router.get("/pipeline/{requisition_id}", response_model=schemas.PipelineOut)
def pipeline(
    requisition_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    req = crud.get_requisition(db, requisition_id)
    if not req:
        raise HTTPException(status_code=404, detail="Requisition not found")
    if current_user.role == models.UserRole.client_manager and req.client_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your client requisition")
    counts = crud.pipeline_counts(db, requisition_id)
    order = ["sourced", "shortlisted", "rejected", "interviewed", "offered", "joined"]
    stages = [schemas.PipelineStageCount(stage=s, count=counts.get(s, 0)) for s in order]
    return schemas.PipelineOut(requisition_id=requisition_id, stages=stages, total=sum(counts.values()))
