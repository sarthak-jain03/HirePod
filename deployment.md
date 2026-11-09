# HirePod — Deployment & Evaluation Guide

## Project Links

- **Live Application URL:** [https://hirepod-five.vercel.app/](https://hirepod-five.vercel.app/)
- **GitHub Repository:** [https://github.com/sarthak-jain03/HirePod](https://github.com/sarthak-jain03/HirePod)

---

## Demo Login Credentials for Reviewer

The application comes pre-seeded with all three operational roles required by the problem statement. The reviewer can sign in using these accounts (password for all accounts is `password`):

| Role | Email | Password | Primary Review Tasks |
|------|-------|----------|----------------------|
| **Recruiter** | `recruiter@hirepod.demo` | `password` | Create JDs, extract AI scorecards, bulk upload CVs, view ranked candidates with quoted evidence, open CVs (compliance gate), submit candidates to client shortlist. |
| **Client Hiring Manager** | `client@hirepod.demo` | `password` | Review submitted candidate shortlists with masked contact info, shortlist candidates, reject with reason, or propose interview slots. |
| **Delivery Head** | `delivery@hirepod.demo` | `password` | Review weekly AI vs. recruiter calibration alignment rate, inspect immutable DPDP view logs, track time-to-shortlist metrics. |

> **Quick Switcher:** Once logged in, you can switch between Recruiter, Client Manager, and Delivery Head at any time using the **1-click Role Switcher** in the top navigation bar or sidebar.

---

## Step-by-Step Local Run Instructions

### 1. Prerequisites
- **Python:** Version 3.11 or higher
- **Node.js:** Version 18.0 or higher (with `npm`)
- **Git**

### 2. Clone the Repository
```bash
git clone https://github.com/sarthak-jain03/HirePod.git
cd HirePod
```

### 3. Backend Setup & Run

Open a terminal in the project root:

```bash
# 1. Create a Python virtual environment
python -m venv backend/.venv

# 2. Activate the virtual environment
# On Windows (PowerShell):
.\backend\.venv\Scripts\activate
# On macOS/Linux:
# source backend/.venv/bin/activate

# 3. Install required Python packages
pip install -r backend/requirements.txt

# 4. Set up environment variables
# Copy the example file:
cp backend/.env.example backend/.env
# (Configure your environment variables in backend/.env as described below)

# 5. Initialize database tables and seed sample data
$env:PYTHONPATH="backend"
python backend/seed.py

# 6. Start the FastAPI backend server
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```

The backend API will start at: `http://localhost:8000`  
Interactive Swagger API documentation: `http://localhost:8000/docs`

### 4. Frontend Setup & Run

Open a second terminal window in the project root:

```bash
# 1. Navigate to frontend directory
cd frontend

# 2. Install Node dependencies
npm install

# 3. Start the Vite development server
npm run dev
```

Open your browser at: `http://localhost:5173`

### 5. Running Automated Tests

To run the automated backend test suite (validating auth, scoring, evidence quotes, client isolation, and DPDP erasure):

```bash
# From project root with virtual environment activated:
$env:PYTHONPATH="backend"
pytest backend/app/tests -v
```

---

## How the Application is Deployed

HirePod is deployed on **Vercel** as a unified multi-service monorepo configured via `vercel.json`:

1. **Frontend:**
   - React 18 SPA built with Vite (`frontend/`).
   - Served statically across Vercel's global Edge CDN with client-side SPA routing fallback to `/index.html`.
2. **Backend:**
   - FastAPI REST API (`backend/`).
   - Deployed as a Python Serverless Function via `backend/main.py`.
   - Vercel routes all `/api/*` traffic to the FastAPI serverless handler on the same domain, eliminating cross-origin (CORS) complexity.
3. **Database:**
   - Hosted serverless **PostgreSQL** instance on **Neon** (`aws.neon.tech`) with connection pooling enabled.
   - Includes automatic DNS-over-HTTPS fallback in `database.py` for network resilience.
4. **AI Inference:**
   - **Groq API** running openai/gpt-oss-120b model with structured JSON mode and low temperature (0.2) for deterministic scoring and quoted evidence extraction.

---

## Environment Variables 

In compliance with the submission rules, only variable names are listed below. **No secret values or API keys are included.**

| Variable Name | Purpose | Required For |
|---|---|---|
| `DATABASE_URL` | Relational database connection string (PostgreSQL in production; SQLite fallback in local dev) | Backend |
| `SECRET_KEY` | Cryptographic secret used for signing JWT access tokens | Backend |
| `ALGORITHM` | JWT signing algorithm (e.g., `HS256`) | Backend |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Lifetime duration for user session tokens | Backend |
| `GROQ_API_KEY` | API authentication key for Groq AI inference engine | Backend |
| `GROQ_MODEL` | AI model identifier (e.g., `openai/gpt-oss-120b`) | Backend |
| `AI_MODE` | Operating mode: `real` (live Groq inference) or `mock` (deterministic rule-based fallback) | Backend |
| `MAX_UPLOAD_FILES` | Maximum allowed CV files per bulk upload batch (set to 500 per problem statement) | Backend |
| `MAX_FILE_MB` | Maximum file size limit in megabytes for uploaded PDF/DOCX resumes | Backend |

---

## Recommended Walkthrough

1. **Sign in as Recruiter:**
   - Go to [https://hirepod-five.vercel.app/](https://hirepod-five.vercel.app/) and sign in with `recruiter@hirepod.demo` / `password`.
   - Check the **Dashboard** — note the active *Senior Java Developer* requisition with 3 screened candidates.
2. **Inspect Ranked Candidates with Quoted Evidence:**
   - Navigate to **Ranked Candidates** (`/ranked/1`).
   - Review the candidate fit scores (0–100) and inspect the **Scorecard Evidence** column showing verbatim quoted lines from each CV.
3. **Verify Compliance Gate:**
   - Note that the "Submit to client" button is disabled until you click **"Open CV"**.
   - Click "Open CV" to view profile details and log the mandatory DPDP access view.
   - Submit candidate Ritika Bansal to the client shortlist.
4. **Test Client Review Portal & Masked PII:**
   - Switch role to **Client Manager** using the top pill bar.
   - Navigate to **Client Portal** (`/client`).
   - Notice candidate contact details are masked (`r****@...`, `+91 ****...`).
   - Test **Shortlist Candidate**, **Propose Interview Slot**, or **Reject with Reason**.
5. **Inspect Pipeline & Calibration:**
   - View the requisition funnel under **Pipeline** (`/pipeline/1`).
   - Switch to **Delivery Head** and open **Audit & Calibration** (`/audit`) to review the AI vs. recruiter alignment rate and the immutable DPDP access audit trail.

