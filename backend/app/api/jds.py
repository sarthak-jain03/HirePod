from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session

from ..database import get_db
from .. import models, schemas, crud
from ..deps import get_current_user, require_role
from ..services import parsing, scoring

router = APIRouter(prefix="/api/jds", tags=["jd"])


def _scorecard_criteria(requisition: models.Requisition) -> List[dict]:
    criteria = []
    for skill in (requisition.must_have_skills or []):
        criteria.append({"name": skill, "weight": 1.0, "required": True})
    if requisition.experience_min is not None or requisition.experience_max is not None:
        lo = requisition.experience_min or 0
        hi = requisition.experience_max or 10
        criteria.append({
            "name": f"Experience {lo}-{hi} years",
            "weight": 1.2,
            "required": True,
        })
    if requisition.notice_period_days is not None:
        criteria.append({
            "name": f"Notice up to {requisition.notice_period_days} days",
            "weight": 0.8,
            "required": False,
        })
    if requisition.ctc_lakhs:
        criteria.append({"name": f"CTC around {requisition.ctc_lakhs} lakhs", "weight": 0.8, "required": False})
    return criteria


@router.post("", response_model=schemas.RequisitionOut)
@router.post("/", response_model=schemas.RequisitionOut)
def create_requisition(
    requisition_in: schemas.RequisitionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(models.UserRole.recruiter, models.UserRole.delivery_head)),
):
    return crud.create_requisition(db, requisition_in, current_user)


@router.post("/{requisition_id}/extract", response_model=dict)
def extract_scorecard(
    requisition_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    req = crud.get_requisition(db, requisition_id)
    if not req:
        raise HTTPException(status_code=404, detail="Requisition not found")
    svc = scoring.ScoringService()
    extracted = crud.extract_scorecard_from_jd(req.description, svc)
    req.must_have_skills = extracted.get("must_have_skills") or []
    req.nice_to_have_skills = extracted.get("nice_to_have_skills") or []
    req.experience_min = extracted.get("experience_min")
    req.experience_max = extracted.get("experience_max")
    req.ctc_lakhs = extracted.get("ctc_lakhs")
    req.notice_period_days = extracted.get("notice_period_days")
    req.location = extracted.get("location") or req.location
    req.scorecard_raw = extracted.get("raw_summary")
    db.commit()
    db.refresh(req)
    return extracted


@router.get("", response_model=List[schemas.RequisitionOut])
@router.get("/", response_model=List[schemas.RequisitionOut])
def list_requisitions(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return crud.list_requisitions(db, current_user, status)


@router.get("/{requisition_id}", response_model=schemas.RequisitionOut)
def get_requisition(
    requisition_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    req = crud.get_requisition(db, requisition_id)
    if not req:
        raise HTTPException(status_code=404, detail="Requisition not found")
    if current_user.role == models.UserRole.client_manager and req.client_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your client requisition")
    return req


@router.put("/{requisition_id}", response_model=schemas.RequisitionOut)
def update_requisition(
    requisition_id: int,
    requisition_in: schemas.RequisitionUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    req = crud.get_requisition(db, requisition_id)
    if not req:
        raise HTTPException(status_code=404, detail="Requisition not found")
    if current_user.role == models.UserRole.client_manager and req.client_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your client requisition")
    return crud.update_requisition(db, requisition_id, requisition_in)


@router.get("/{requisition_id}/criteria")
def get_criteria(requisition_id: int, db: Session = Depends(get_db),
                 current_user: models.User = Depends(get_current_user)):
    req = crud.get_requisition(db, requisition_id)
    if not req:
        raise HTTPException(status_code=404, detail="Requisition not found")
    return _scorecard_criteria(req)
