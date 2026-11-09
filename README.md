# HirePod — AI Resume Screening & Client Shortlist Portal

> **Company A, Noida** — Contract & permanent hiring for IT services, banking back-office, and retail clients. 120 staff, 70 recruiters, ₹40–50 crore revenue/year.

HirePod replaces the manual CV screening process (1,800 hours/month, ₹1.57 crore annual cost) with AI-powered resume scoring, bulk CV parsing, and a client review portal — all compliant with the DPDP Act 2023.

---

## Success Metrics

| Metric | Before | Target | 
|--------|--------|--------|
| Screening time per requisition | 6 hours | **Down 60%** (~2.4 hours) |
| Shortlist turnaround | 5 days | **Within 48 hours** for 80% of requisitions |
| Client acceptance rate | 45% | **60%** |
| Annual cost saved | — | **₹1.57 crore** |

---

## Core Screens (6–8)

| # | Screen | Route | Role |
|---|--------|-------|------|
| 1 | **Login** | `/login` | All |
| 2 | **Recruiter Dashboard** | `/` | Recruiter / Delivery Head |
| 3 | **JD Scorecard** (create/edit) | `/jd/new`, `/jd/:id/edit` | Recruiter |
| 4 | **Bulk CV Upload** | `/upload/:id` | Recruiter |
| 5 | **Ranked Candidates** (AI scores + evidence) | `/ranked/:id` | Recruiter |
| 6 | **Client Review Portal** | `/client` | Client Manager |
| 7 | **Pipeline** (sourced → joined) | `/pipeline/:id` | All |
| 8 | **Audit & Calibration** | `/audit` | Delivery Head |

Bonus: **Candidate Profile** (`/candidate/:id`) with DPDP consent management and right-to-erasure.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Backend** | Python 3.11, FastAPI 0.115, SQLAlchemy 2.0, SQLite |
| **AI** | Groq API (`openai/gpt-oss-120b`) with rule-based fallback |
| **Frontend** | React 18, Vite 5, Tailwind CSS 3, Lucide React icons |
| **CV Parsing** | PyMuPDF (text PDFs), python-docx (DOCX), Tesseract OCR (scanned PDFs) |
| **Auth** | JWT tokens via `python-jose`, `bcrypt` password hashing |

---

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- (Optional) Tesseract OCR for scanned PDF support

### Backend Setup

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt
```

Create `backend/.env` (copy from `.env.example`):
```env
DATABASE_URL=sqlite:///./recruit.db
SECRET_KEY=dev-secret-change-me
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=openai/gpt-oss-120b
AI_MODE=real
```

Seed sample data and start:
```bash
python seed.py
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### Demo Credentials (password: `password`)

| Role | Email |
|------|-------|
| Recruiter | `recruiter@hirepod.demo` |
| Client Manager | `client@hirepod.demo` |
| Delivery Head | `delivery@hirepod.demo` |

---

## Sample Data (from Problem Statement)

| Candidate ID | Name | Current Role | Experience | Key Skills | Notice |
|---|---|---|---|---|---|
| CND-91022 | Ritika Bansal | Senior Java Developer | 6.5 yrs | Java, Spring Boot, microservices | 60 days |
| CND-91047 | Arjun Rawat | KYC Analyst | 3.0 yrs | KYC, AML checks, Excel | 30 days |
| CND-91088 | Pooja Nair | Java Developer | 4.0 yrs | Java, Hibernate, REST APIs | 90 days |

**Example JD:** Senior Java Developer, 5–8 years, Spring Boot, Noida, notice up to 60 days

---

## AI & Fairness Rules

1. **Zero auto-rejections** — AI never rejects; every candidate gets a score with evidence
2. **Evidence-backed** — Each criterion score includes verbatim quotes from the CV
3. **PII redacted** — Name, gender, age, photo, marital status stripped before AI scoring
4. **Mandatory recruiter review** — Recruiter must open CV before submitting to client
5. **Low scorers stay searchable** — No candidate is hidden or removed from the system
6. **Weekly calibration** — Delivery Head reviews AI ranks vs recruiter choices

## DPDP Act 2023 Compliance

- ✅ Explicit candidate consent recorded on upload
- ✅ Hiring-use-only constraint
- ✅ Right to erasure (soft delete on request)
- ✅ Immutable access log (who viewed what, when, for which requisition)
- ✅ Client isolation (each client sees only candidates submitted to them)
- ✅ Contact masking in client portal (email/phone partially hidden)

---

## API Documentation

Swagger UI available at: `http://localhost:8000/docs`

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/token` | Login (returns JWT) |
| POST | `/api/jds` | Create requisition with JD |
| POST | `/api/jds/{id}/extract` | AI scorecard extraction |
| POST | `/api/candidates/bulk-upload` | Upload CVs (PDF/DOCX) |
| POST | `/api/candidates/demo-batch` | Load demo candidates |
| POST | `/api/applications/score/{req_id}` | Score candidates against scorecard |
| POST | `/api/applications/{id}/decision` | Client shortlist/reject/propose slot |
| GET  | `/api/applications/pipeline/{req_id}` | Pipeline stage counts |
| GET  | `/api/audit/calibration` | Weekly AI calibration report |
| GET  | `/api/audit/logs` | DPDP access audit trail |

---

## Project Structure

```
├── backend/
│   ├── app/
│   │   ├── api/           # Route handlers
│   │   │   ├── auth.py          # Login, register, role switching
│   │   │   ├── jds.py           # JD CRUD + scorecard extraction
│   │   │   ├── candidates.py    # Bulk upload, demo batch, consent, delete
│   │   │   ├── applications.py  # Scoring, submission, client decisions, pipeline
│   │   │   └── audit.py         # Calibration report + DPDP logs
│   │   ├── services/
│   │   │   ├── parsing.py       # PDF/DOCX text extraction, CV parsing
│   │   │   └── scoring.py       # AI scoring (Groq) + PII redaction + mock fallback
│   │   ├── models.py      # SQLAlchemy models
│   │   ├── schemas.py     # Pydantic schemas
│   │   ├── crud.py        # Database operations
│   │   ├── config.py      # Environment config
│   │   ├── database.py    # DB engine setup
│   │   ├── deps.py        # Auth dependencies
│   │   └── security.py    # JWT + bcrypt
│   ├── tests/
│   │   └── test_app.py    # 7 automated tests
│   ├── seed.py            # Sample data seeder
│   ├── requirements.txt
│   ├── .env.example
│   └── .env               # (gitignored)
├── frontend/
│   ├── src/
│   │   ├── pages/         # 9 page components
│   │   ├── components/    # Layout with role switcher
│   │   ├── services/      # API client + PII masking utils
│   │   ├── App.jsx        # Router config
│   │   └── index.css      # Tailwind + custom components
│   ├── package.json
│   └── vite.config.js     # Proxy /api → backend
├── .gitignore
└── README.md
```

---

## Running Tests

```bash
cd backend
PYTHONPATH=. python -m pytest app/tests/ -v
```

---

## Budget & Timeline

₹7 lakh, 6 weeks. This repository delivers the **Core Build** slice end-to-end.

## Out of Scope

- Job board integrations or scraping
- Video interviews
- Background verification

