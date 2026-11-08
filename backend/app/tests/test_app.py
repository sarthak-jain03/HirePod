import os

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.main import app
from app.database import get_db
from app import models
from app.schemas import UserCreate
from app.crud import create_user

SQLALCHEMY_DATABASE_URL = "sqlite:///./test_recruit.db"

engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


def setup_module(module):
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    if not db.query(models.User).filter(models.User.email == "r@test.com").first():
        create_user(db, UserCreate(email="r@test.com", password="pw", role="recruiter", company="T"))
    db.close()


def teardown_module(module):
    engine.dispose()
    try:
        os.remove(SQLALCHEMY_DATABASE_URL.replace("sqlite:///", ""))
    except OSError:
        pass


def auth_header(email="r@test.com", password="pw"):
    resp = client.post("/api/auth/token", data={"email": email, "password": password})
    assert resp.status_code == 200, resp.text
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


def test_login():
    assert auth_header()


def make_requisition(h):
    resp = client.post("/api/jds/", json={
        "title": "Senior Java Developer",
        "description": "Java, Spring Boot, Noida, 5-8 years, notice up to 60 days",
        "location": "Noida",
        "experience_min": 5,
        "experience_max": 8,
        "must_have_skills": ["Java", "Spring Boot"],
        "client_id": None,
    }, headers=h)
    assert resp.status_code == 200, resp.text
    return resp.json()["id"]


def test_create_requisition():
    h = auth_header()
    assert make_requisition(h) >= 1


def test_extract_scorecard():
    h = auth_header()
    req_id = make_requisition(h)
    resp = client.post(f"/api/jds/{req_id}/extract", headers=h)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert "must_have_skills" in data


def test_score_has_evidence():
    h = auth_header()
    req_id = make_requisition(h)
    from app.crud import create_candidate
    db = TestingSessionLocal()
    cand = create_candidate(db, {
        "candidate_id": "CND-T1", "name": "Ada Dev", "email": "ada@test.com",
        "key_skills": ["Java", "Spring Boot", "microservices"],
        "experience_years": "6", "notice_days": 30,
    }, source_file="ada.pdf")
    db.close()
    resp = client.post(f"/api/applications/score/{req_id}", headers=h)
    assert resp.status_code == 200, resp.text
    scores = resp.json()
    ada = [s for s in scores if s["candidate_id"] == "CND-T1"][0]
    assert ada["total_score"] > 0
    for criterion in ada["breakdown"]:
        assert isinstance(criterion["evidence"], list)
    assert ada["reasoning"]

def test_client_isolation():
    h = auth_header()
    resp = client.post("/api/jds/", json={
        "title": "Client Req", "description": "Java developer", "client_id": 999,
    }, headers=h)
    assert resp.status_code == 200
    req_id = resp.json()["id"]
    create_user(TestingSessionLocal(), UserCreate(email="c@test.com", password="pw", role="client_manager", company="T"))
    resp2 = client.post("/api/auth/token", data={"email": "c@test.com", "password": "pw"})
    ch = {"Authorization": f"Bearer {resp2.json()['access_token']}"}
    resp3 = client.get(f"/api/jds/{req_id}", headers=ch)
    assert resp3.status_code == 403


def test_consent_and_delete():
    h = auth_header()
    from app.crud import create_candidate
    db = TestingSessionLocal()
    cand = create_candidate(db, {"candidate_id": "CND-T2", "name": "Del User", "email": "del@test.com"}, source_file="d.pdf")
    cid = cand.id
    db.close()
    resp = client.post(f"/api/candidates/{cid}/consent?consent=false", headers=h)
    assert resp.status_code == 200
    resp = client.delete(f"/api/candidates/{cid}", headers=h)
    assert resp.status_code == 200
    resp = client.get(f"/api/candidates/{cid}", headers=h)
    assert resp.status_code == 410


def test_ai_scoring_service_evidence():
    from app.services.scoring import ScoringService
    svc = ScoringService()
    result = svc.score_cv("Java Spring Boot microservices developer with 6 years experience", [
        {"name": "Java", "weight": 1.0, "required": True},
        {"name": "Experience 5-8 years", "weight": 1.0, "required": True},
    ])
    assert 0 <= result["total_score"] <= 100
    assert any("Java" in b["criterion"] for b in result["breakdown"])
