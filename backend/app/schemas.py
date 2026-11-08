from typing import Any, Dict, List, Optional
from pydantic import BaseModel, EmailStr, ConfigDict
from datetime import datetime


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    email: Optional[str] = None


class UserBase(BaseModel):
    email: EmailStr
    role: str
    company: Optional[str] = None


class UserCreate(UserBase):
    password: str


class UserOut(UserBase):
    id: int
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# --- Requisition / JD scorecard ---

class ScorecardCriterion(BaseModel):
    name: str  # e.g. "Java", "Experience", "CTC", "Notice period"
    weight: float = 1.0
    required: bool = True


class RequisitionBase(BaseModel):
    title: str
    description: str
    location: Optional[str] = None
    experience_min: Optional[int] = None
    experience_max: Optional[int] = None
    ctc_lakhs: Optional[str] = None
    notice_period_days: Optional[int] = None
    must_have_skills: Optional[List[str]] = None
    nice_to_have_skills: Optional[List[str]] = None
    client_id: Optional[int] = None


class RequisitionCreate(RequisitionBase):
    pass


class RequisitionUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    experience_min: Optional[int] = None
    experience_max: Optional[int] = None
    ctc_lakhs: Optional[str] = None
    notice_period_days: Optional[int] = None
    must_have_skills: Optional[List[str]] = None
    nice_to_have_skills: Optional[List[str]] = None
    status: Optional[str] = None


class RequisitionOut(RequisitionBase):
    id: int
    status: str
    created_by: int
    created_at: datetime
    updated_at: datetime
    application_count: Optional[int] = 0
    shortlisted_count: Optional[int] = 0

    model_config = ConfigDict(from_attributes=True)


# --- Candidate ---

class CandidateBase(BaseModel):
    candidate_id: str
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    current_role: Optional[str] = None
    experience_years: Optional[str] = None
    key_skills: Optional[List[str]] = None
    notice_days: Optional[int] = None
    location: Optional[str] = None


class CandidateOut(CandidateBase):
    id: int
    consent: bool
    consent_status: str
    consent_at: Optional[datetime]
    deleted_at: Optional[datetime]
    source_file: Optional[str]
    duplicate_of: Optional[int]

    model_config = ConfigDict(from_attributes=True)


# --- Scoring ---

class CriterionScore(BaseModel):
    criterion: str
    score: int  # 0-100
    evidence: List[str]  # quoted lines from CV


class CVScoreOut(BaseModel):
    id: int
    candidate_id: str
    name: str
    current_role: Optional[str]
    experience_years: Optional[str]
    key_skills: Optional[List[str]]
    notice_days: Optional[int]
    total_score: int
    breakdown: List[CriterionScore]
    reasoning: str
    file_name: Optional[str]


# --- Application ---

class ApplicationBase(BaseModel):
    status: str
    recruiter_notes: Optional[str] = None


class ApplicationCreate(ApplicationBase):
    candidate_id: int
    requisition_id: int


class ApplicationOut(ApplicationBase):
    id: int
    requisition_id: int
    candidate_id: int
    candidate: Optional[CandidateOut] = None
    ai_score: Optional[int] = None
    ai_breakdown: Optional[Any] = None
    ai_evidence: Optional[Any] = None
    ai_reasoning: Optional[str] = None
    client_decision: Optional[str] = None
    client_decision_reason: Optional[str] = None
    interview_slot_proposed: Optional[str] = None
    submitted_by: Optional[int] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# --- Client portal actions ---

class ClientDecision(BaseModel):
    decision: str  # shortlisted | rejected | interview_proposed
    reason: Optional[str] = None
    interview_slot: Optional[str] = None


# --- Consent ---

class ConsentOut(BaseModel):
    candidate_id: int
    consent: bool
    consent_status: str
    consent_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)


# --- Pipeline ---

class PipelineStageCount(BaseModel):
    stage: str
    count: int


class PipelineOut(BaseModel):
    requisition_id: int
    stages: List[PipelineStageCount]
    total: int
