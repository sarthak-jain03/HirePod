import io
import os
import re
import hashlib
from typing import List, Tuple, Optional

import fitz  # PyMuPDF
import docx  # python-docx

try:
    import pytesseract
    from PIL import Image
    TESSERACT_AVAILABLE = True
except Exception:  # pragma: no cover - tesseract may not be installed
    TESSERACT_AVAILABLE = False

EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9._%+-]+\.[A-Za-z]{2,}")
PHONE_RE = re.compile(r"(\+?\d{1,3}[\s-]?)?(\d{3,4}[\s-]?\d{3}[\s-]?\d{4}|\d{10})")
YEARS_RE = re.compile(r"(\d+(?:\.\d+)?)\s*(?:\+?\s*)?years?", re.IGNORECASE)


def extract_text_from_pdf(file_bytes: bytes) -> Tuple[str, bool, str]:
    """Return (text, is_scanned, note). PyMuPDF text extraction; OCR fallback for scans."""
    text_parts = []
    try:
        doc = fitz.open(stream=file_bytes, filetype="pdf")
    except Exception as exc:
        return "", False, f"Could not open PDF: {exc}"

    for page in doc:
        text_parts.append(page.get_text())

    text = "\n".join(text_parts).strip()

    if len(text) < 30:
        # Likely a scanned CV: try OCR
        if not TESSERACT_AVAILABLE:
            return "", True, "Scanned PDF detected but Tesseract OCR is not installed on this server. Upload a text-based PDF/DOCX or install Tesseract."
        try:
            doc = fitz.open(stream=file_bytes, filetype="pdf")
            ocr_parts = []
            for page in doc:
                pix = page.get_pixmap(dpi=200)
                img = Image.open(io.BytesIO(pix.tobytes("png")))
                ocr_parts.append(pytesseract.image_to_string(img))
            text = "\n".join(ocr_parts).strip()
            note = "Scanned PDF - text recovered via Tesseract OCR"
        except Exception as exc:
            return "", True, f"OCR failed: {exc}"
    else:
        note = "Text-based PDF"

    return text, False, note


def extract_text_from_docx(file_bytes: bytes) -> Tuple[str, str]:
    try:
        document = docx.Document(io.BytesIO(file_bytes))
    except Exception as exc:
        return "", f"Could not open DOCX: {exc}"
    parts = [p.text for p in document.paragraphs if p.text.strip()]
    for table in document.tables:
        for row in table.rows:
            for cell in row.cells:
                if cell.text.strip():
                    parts.append(cell.text)
    return "\n".join(parts).strip(), "DOCX"


def parse_cv_text(text: str) -> dict:
    """Heuristic field extraction from CV text. Deterministic, explainable."""
    profile = {
        "name": None,
        "email": None,
        "phone": None,
        "current_role": None,
        "experience_years": None,
        "key_skills": [],
        "notice_days": None,
        "location": None,
    }

    lines = [l.strip() for l in text.splitlines() if l.strip()]
    # Heuristic: first non-empty line that looks like a name (2-4 words, no email/phone/digits)
    for line in lines[:6]:
        if (len(line.split()) >= 2 and len(line.split()) <= 4
                and "@" not in line and not any(ch.isdigit() for ch in line)
                and not line.lower().startswith(("http", "www", "linkedin", "github"))):
            profile["name"] = line
            break

    emails = EMAIL_RE.findall(text)
    if emails:
        profile["email"] = emails[0]

    phones = PHONE_RE.findall(text)
    if phones:
        # PHONE_RE with groups returns tuples; normalize
        raw = phones[0]
        phone = raw[0] if isinstance(raw, tuple) else raw
        profile["phone"] = re.sub(r"\D", "", phone) or None

    # Experience: take the largest years figure mentioned (heuristic)
    years = [float(m) for m in YEARS_RE.findall(text)]
    if years:
        profile["experience_years"] = str(max(years))

    # Skills: look for a skills section
    skills = _extract_skills(text)
    profile["key_skills"] = skills

    # Notice period hints
    notice_match = re.search(r"notice\s*(?:period)?\s*[:–-]?\s*(\d+)\s*days?", text, re.IGNORECASE)
    if notice_match:
        profile["notice_days"] = int(notice_match.group(1))
    else:
        month_match = re.search(r"(\d+)\s*months?", text, re.IGNORECASE)
        if month_match:
            profile["notice_days"] = int(month_match.group(1)) * 30

    # Location: simple heuristic - common cities near "based in" / "location"
    loc_match = re.search(r"(?:based in|location|located in)\s*[:–-]?\s*([A-Za-z\s,]{2,60})", text, re.IGNORECASE)
    if loc_match:
        profile["location"] = loc_match.group(1).strip()

    return profile


def _extract_skills(text: str) -> List[str]:
    known = [
        "Java", "Spring Boot", "Hibernate", "REST", "REST APIs", "Microservices", "Python",
        "Django", "Flask", "Node.js", "React", "Angular", "SQL", "PostgreSQL", "MongoDB",
        "AWS", "Azure", "Docker", "Kubernetes", "Git", "Jenkins", "CI/CD", "KYC", "AML",
        "Excel", "SAP", "Oracle", "HTML", "CSS", "JavaScript", "TypeScript", "Go", "Ruby",
        "PHP", "C++", "C#", ".NET", "Tableau", "Power BI", "Salesforce",
    ]
    found = []
    tl = text.lower()
    for skill in known:
        if skill.lower() in tl:
            found.append(skill)
    return found


def normalize_email(email: Optional[str]) -> Optional[str]:
    return email.strip().lower() if email else None


def normalize_phone(phone: Optional[str]) -> Optional[str]:
    if not phone:
        return None
    digits = re.sub(r"\D", "", phone)
    return digits or None


def duplicate_key(email: Optional[str], phone: Optional[str]) -> str:
    parts = [normalize_email(email) or "", normalize_phone(phone) or ""]
    return hashlib.sha256("|".join(parts).encode()).hexdigest()[:32]
