from datetime import datetime
from sqlalchemy import (
    Boolean, Column, DateTime, ForeignKey, Integer, String, Text, JSON, Enum, Index
)
from sqlalchemy.orm import relationship
import enum

from .database import Base


class UserRole(str, enum.Enum):
    recruiter = "recruiter"
    client_manager = "client_manager"
    delivery_head = "delivery_head"


class RequisitionStatus(str, enum.Enum):
    open = "open"
    closed = "closed"
    filled = "filled"


class ApplicationStatus(str, enum.Enum):
    sourced = "sourced"
    shortlisted = "shortlisted"
    rejected = "rejected"
    interviewed = "interviewed"
    offered = "offered"
    joined = "joined"


class ConsentStatus(str, enum.Enum):
    given = "given"
    withdrawn = "withdrawn"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), nullable=False)
    company = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    requisitions = relationship("Requisition", back_populates="creator", foreign_keys="Requisition.created_by")
    applications = relationship("Application", back_populates="submitter")
    view_logs = relationship("CandidateViewLog", back_populates="viewer")


class Requisition(Base):
    __tablename__ = "requisitions"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # client company owner
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)  # raw JD text
    status = Column(Enum(RequisitionStatus), default=RequisitionStatus.open)
    location = Column(String(255), nullable=True)
    experience_min = Column(Integer, nullable=True)
    experience_max = Column(Integer, nullable=True)
    ctc_lakhs = Column(String(50), nullable=True)
    notice_period_days = Column(Integer, nullable=True)
    # Must-have skills extracted by AI / edited by recruiter
    must_have_skills = Column(JSON, nullable=True)  # list of strings
    nice_to_have_skills = Column(JSON, nullable=True)  # list of strings
    scorecard_raw = Column(Text, nullable=True)  # raw AI extraction text
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    creator = relationship("User", back_populates="requisitions", foreign_keys=[created_by])
    applications = relationship("Application", back_populates="requisition")


class Candidate(Base):
    __tablename__ = "candidates"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(String(50), unique=True, index=True, nullable=False)  # CND-91022
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=True, index=True)
    phone = Column(String(50), nullable=True, index=True)
    current_role = Column(String(255), nullable=True)
    experience_years = Column(String(20), nullable=True)
    key_skills = Column(JSON, nullable=True)  # list of strings
    notice_days = Column(Integer, nullable=True)
    location = Column(String(255), nullable=True)
    parsed_profile = Column(JSON, nullable=True)  # full parsed output
    source_file = Column(String(500), nullable=True)
    duplicate_of = Column(Integer, ForeignKey("candidates.id"), nullable=True)
    consent = Column(Boolean, default=False)
    consent_status = Column(Enum(ConsentStatus), default=ConsentStatus.given)
    consent_at = Column(DateTime, nullable=True)
    deleted_at = Column(DateTime, nullable=True)

    original = relationship("Candidate", remote_side=[id], foreign_keys=[duplicate_of])

    applications = relationship("Application", back_populates="candidate")
    view_logs = relationship("CandidateViewLog", back_populates="candidate")


class CandidateViewLog(Base):
    __tablename__ = "candidate_view_logs"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id"), nullable=False)
    viewer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    viewed_at = Column(DateTime, default=datetime.utcnow)
    requisition_id = Column(Integer, ForeignKey("requisitions.id"), nullable=True)

    candidate = relationship("Candidate", back_populates="view_logs")
    viewer = relationship("User", back_populates="view_logs")
    requisition = relationship("Requisition")


class Application(Base):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True)
    requisition_id = Column(Integer, ForeignKey("requisitions.id"), nullable=False)
    candidate_id = Column(Integer, ForeignKey("candidates.id"), nullable=False)
    status = Column(Enum(ApplicationStatus), default=ApplicationStatus.sourced)
    ai_score = Column(Integer, nullable=True)  # 0-100
    ai_breakdown = Column(JSON, nullable=True)  # per-criterion scores
    ai_evidence = Column(JSON, nullable=True)  # per-criterion evidence quotes
    ai_reasoning = Column(Text, nullable=True)  # overall reasoning text
    recruiter_notes = Column(Text, nullable=True)
    client_decision = Column(String(100), nullable=True)  # shortlisted / rejected / interview_proposed
    client_decision_reason = Column(Text, nullable=True)
    interview_slot_proposed = Column(String(255), nullable=True)
    submitted_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    submitted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    requisition = relationship("Requisition", back_populates="applications")
    candidate = relationship("Candidate", back_populates="applications")
    submitter = relationship("User", back_populates="applications")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    action = Column(String(100), nullable=False)
    actor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    target_type = Column(String(50), nullable=True)
    target_id = Column(String(50), nullable=True)
    details = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    actor = relationship("User")


class ConsentRecord(Base):
    __tablename__ = "consent_records"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id"), nullable=False)
    granted_by = Column(String(100), nullable=True)  # who collected consent
    granted_at = Column(DateTime, default=datetime.utcnow)
    withdrawn_at = Column(DateTime, nullable=True)
    purpose = Column(String(255), default="hiring")


Index("ix_applications_requisition_status", Application.requisition_id, Application.status)
