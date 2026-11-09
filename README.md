# HirePod — AI Resume Screening & Client Shortlist Portal

**HirePod** is an enterprise AI-native recruitment screening platform and client shortlist portal built for staffing agencies, contract recruiters, and corporate talent teams. It eliminates manual resume triage by extracting editable job scorecards, parsing CVs in bulk with duplicate detection, generating verifiable fit scores backed by verbatim quotes from each candidate's resume, and presenting masked shortlists to client hiring managers in a dedicated portal.

 **Live Production App:** [https://hirepod-five.vercel.app](https://hirepod-five.vercel.app/)

---

## Quick Demo Access

Try all three operational roles instantly on the live deployment:

| Role | Demo Email | Password | Primary Capabilities |
|------|------------|----------|----------------------|
| **Recruiter** | `recruiter@hirepod.demo` | `password` | JD creation, bulk CV upload, AI scoring with quotes, CV inspection, client submission |
| **Client Manager** | `client@hirepod.demo` | `password` | Review masked profiles, candidate shortlisting, reject with reason, interview scheduling |
| **Delivery Head** | `delivery@hirepod.demo` | `password` | Weekly AI vs recruiter calibration, alignment rates, DPDP access audit logs |


---

## Key Features

### 1. Automated JD Scorecard Intake
- Paste raw Job Descriptions from client emails or portals.
- **Groq AI** extracts must-have criteria, secondary nice-to-have skills, experience bounds (min/max), notice period thresholds, and budget (CTC) into an editable scorecard.
- Fully customizable weighting and required/optional criterion flags.

### 2. Bulk CV Upload & Intelligent Parsing
- Ingest batches of up to **500 resumes** simultaneously in **PDF** or **DOCX** formats.
- Native text extraction via PyMuPDF and python-docx with graceful OCR fallback for scanned CVs.
- Automatic profile normalization (name, current title, total experience, skills, notice days).
- In-memory and database **duplicate detection** by normalized email and phone hashes.

### 3. Verifiable AI Scoring with Quoted Evidence Lines
- No "black box" decisions: every candidate receives a transparent 0–100 fit score broken down criterion-by-criterion.
- Every criterion is backed by **verbatim quoted evidence lines** extracted directly from the candidate's resume.
- Rule-based transparent fallback ensures high availability if external AI APIs are offline.

### 4. Built-In Fairness & Anti-Bias Controls
- **PII Redaction:** Candidate name, gender, age, photo, marital status, and direct contact details are stripped prior to scoring.
- **Zero Auto-Rejection:** The AI never deletes or auto-rejects any applicant; low scorers remain searchable in the database.
- **Human-in-the-Loop Gate:** Recruiters are required to open and inspect candidate profiles before the client submission action unlocks.

### 5. Multi-Tenant Client Review Portal
- Client hiring managers review shortlists in an uncluttered, mobile-responsive portal.
- **Privacy Masking:** Candidate email and phone numbers are masked (`c****@domain.com`, `+91 ****8910`) in accordance with data privacy laws.
- Clients can directly **Shortlist**, **Reject with Feedback Reason**, or **Propose an Interview Slot**.


### 6. DPDP Act 2023 Compliance & Audit Trail
- **Candidate Consent Tracking:** Explicit consent status logged upon CV intake with timestamp and collection agent.
- **Right to Erasure:** Instant soft-delete on candidate request, removing data from active search and client views.
- **Access Logs:** Immutable audit log tracking which recruiter or client viewed which candidate resume and when.

### 7. Delivery Head Executive Calibration
- Weekly sampling compares AI candidate rankings against recruiter submissions to compute calibration alignment rates.
- Executive ROI tracking measuring time-to-shortlist, candidate acceptance rates, and estimated agency savings.

---

## Tech Stack


| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | React 18, Vite 5, Lucide React | High-performance SPA with client-side routing |
| **Styling** | Tailwind CSS 3 | Professional, distraction-free neutral slate design |
| **Backend** | Python 3.11, FastAPI 0.115 | High-speed asynchronous REST API with Swagger docs |
| **ORM** | SQLAlchemy 2.0, Alembic | Type-safe database modeling and migrations |
| **Database** | Neon Serverless PostgreSQL / SQLite | Cloud relational storage with connection pooling |
| **AI Inference** | Groq API (`openai/gpt-oss-120b`) | Ultra-fast LLM scorecard extraction & candidate evaluation |
| **Document Parsing** | PyMuPDF (fitz), python-docx | High-fidelity text extraction from PDF and Word resumes |
| **Authentication** | python-jose (JWT), native bcrypt | Secure stateless bearer tokens and password hashing |
| **Hosting** | Vercel Multi-Services | Unified deployment of Vite frontend and FastAPI backend |

---

## Project Structure

```text
HirePod/
├── api/
│   └── index.py            # Vercel Serverless ASGI entrypoint
├── backend/
│   ├── app/
│   │   ├── api/            # API Route endpoints
│   │   │   ├── applications.py   # Candidate scoring, submission, client decisions, pipeline
│   │   │   ├── audit.py          # Calibration report & DPDP audit logs
│   │   │   ├── auth.py           # Authentication & 1-click role switching
│   │   │   ├── candidates.py     # Bulk upload, parsing, consent, erasure
│   │   │   └── jds.py            # JD management & AI scorecard extraction
│   │   ├── services/
│   │   │   ├── parsing.py        # PDF, DOCX, and OCR resume parsers
│   │   │   └── scoring.py        # AI fit scoring, PII redaction & evidence extractor
│   │   ├── config.py       # Environment configuration
│   │   ├── crud.py         # Database query & mutation operations
│   │   ├── database.py     # Engine connection, DoH resolver fallback
│   │   ├── deps.py         # Role verification & auth dependencies
│   │   ├── main.py         # FastAPI application factory
│   │   ├── models.py       # SQLAlchemy ORM models
│   │   ├── schemas.py      # Pydantic v2 validation schemas
│   │   └── security.py     # Password hashing & JWT creation
│   ├── tests/
│   │   └── test_app.py     # Comprehensive automated test suite
│   ├── requirements.txt    # Python backend dependencies
│   └── seed.py             # Database seeder script
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── Layout.jsx  # App shell, responsive drawer & role switcher
│   │   ├── pages/
│   │   │   ├── AuditCalibration.jsx # Delivery head metrics & view logs
│   │   │   ├── ClientPortal.jsx     # Masked candidate review portal
│   │   │   ├── CVDetail.jsx         # Candidate profile, consent & erasure
│   │   │   ├── Dashboard.jsx        # Recruiter active jobs overview
│   │   │   ├── JDForm.jsx           # AI scorecard extraction & editor
│   │   │   ├── Login.jsx            # Authentication page with demo quick-links
│   │   │   ├── Pipeline.jsx         # Requisition candidate funnel
│   │   │   ├── Ranked.jsx           # Fit-ranked candidates with quote evidence
│   │   │   └── Upload.jsx           # Bulk resume drag-and-drop & demo batch loader
│   │   ├── services/
│   │   │   └── api.js      # Typed API client with token interceptor
│   │   ├── App.jsx         # Application routing tree
│   │   └── index.css       # Global design system & utility classes
│   ├── package.json        # Frontend Node dependencies
│   └── vite.config.js      # Vite build & local dev reverse-proxy
├── .gitignore              # Protects secrets, build outputs & local DBs
├── vercel.json             # Multi-service monorepo routing config
└── README.md
```

---

## Local Development Setup

### 1. Prerequisites
- **Python 3.11+**
- **Node.js 18+** & npm
- *(Optional)* PostgreSQL database (defaults to SQLite automatically if omitted)

### 2. Clone the Repository
```bash
git clone https://github.com/sarthak-jain03/HirePod.git
cd HirePod
```

### 3. Backend Setup
```bash
# Create and activate Python virtual environment
python -m venv backend/.venv

# Windows:
.\backend\.venv\Scripts\activate
# macOS/Linux:
# source backend/.venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt
```

Create a `.env` file inside `backend/` (or copy `backend/.env.example`):
```env
# Database: SQLite for local dev, or PostgreSQL for cloud
DATABASE_URL=sqlite:///./recruit.db
# DATABASE_URL=postgresql://user:password@host/neondb?sslmode=require

SECRET_KEY=dev-secret-change-me
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=600

# Groq AI
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=openai/gpt-oss-120b
AI_MODE=real
```

Run database migrations and seed initial data:
```bash
$env:PYTHONPATH="backend"
python backend/seed.py
```

Start the FastAPI backend server:
```bash
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```
API Documentation will be live at: [http://localhost:8000/docs](http://localhost:8000/docs)

### 4. Frontend Setup
In a new terminal window:
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Running Automated Tests

HirePod includes an automated test suite covering authentication, scorecard extraction, evidence quoting, client isolation, and DPDP right-to-erasure:

```bash
# Set PYTHONPATH to include backend
$env:PYTHONPATH="backend"

# Run pytest
pytest backend/app/tests -v
```

All 7 test suites validate:
- ✅ JWT Authentication & user verification
- ✅ Requisition creation and custom scorecard generation
- ✅ AI scorecard extraction from unstructured JD text
- ✅ Fit scoring with guaranteed per-criterion evidence quotes
- ✅ Multi-tenant client isolation (preventing unauthorized cross-client views)
- ✅ DPDP consent tracking and soft deletion on erasure request
- ✅ Scoring service resilience and heuristic fallback

---

## 📡 Key API Reference

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/api/auth/token` | Obtain JWT bearer token | No |
| `GET` | `/api/auth/me` | Fetch active user profile and role | Yes |
| `POST` | `/api/auth/switch-role/{role}` | Instant role switcher for demo evaluation | No |
| `GET` | `/api/jds` | List active job requisitions | Yes |
| `POST` | `/api/jds` | Create a new requisition | Recruiter / Admin |
| `POST` | `/api/jds/{id}/extract` | AI scorecard extraction from JD text | Yes |
| `POST` | `/api/candidates/bulk-upload` | Upload and parse up to 500 PDF/DOCX resumes | Recruiter |
| `POST` | `/api/candidates/demo-batch` | 1-click load realistic candidate batch | Recruiter |
| `GET` | `/api/applications/ranked/{req_id}` | Fetch candidates scored against scorecard criteria | Yes |
| `POST` | `/api/applications/open/{cand_id}` | Log mandatory CV inspection (DPDP view gate) | Recruiter |
| `POST` | `/api/applications` | Submit candidate to client shortlist | Recruiter |
| `POST` | `/api/applications/{id}/decision` | Client decision (`shortlisted`, `rejected`, `interview_proposed`) | Client / Recruiter |
| `GET` | `/api/applications/pipeline/{req_id}` | Aggregate pipeline funnel stage counts | Yes |
| `GET` | `/api/audit/calibration` | Delivery Head weekly AI calibration report | Delivery Head |
| `GET` | `/api/audit/logs` | Immutable DPDP view and audit logs | Yes |

---

## Privacy & Compliance (DPDP Act 2023)

HirePod is architected from the ground up around the principles of the **Digital Personal Data Protection Act 2023**:

1. **Purpose Limitation:** Resume data is restricted exclusively to evaluating candidate suitability for the specified requisition.
2. **Data Minimization:** Contact details (emails, phone numbers) are masked in all client-facing portals to prevent unsolicited outreach.
3. **Storage Limitation & Right to Erasure:** Candidates can request data deletion at any time, instantly revoking visibility and marking records as deleted.
4. **Accountability & Audit Logs:** Every time a recruiter or client opens a resume, a timestamped record is added to `CandidateViewLog`.
5. **Algorithmic Fairness:** Gender, marital status, age, photos, and candidate names are stripped before feeding resume text to LLMs, ensuring scores reflect purely merit and qualifications.

---

