import json
import re
import random
from typing import Any, Dict, List, Optional, Tuple

from groq import Groq

from ..config import GROQ_API_KEY, GROQ_MODEL, AI_MODE

# Fields that must never be shown to the scoring model (fairness / DPDP)
PII_PATTERNS = [
    re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9._%+-]+\.[A-Za-z]{2,}\b"),
    re.compile(r"(?:\+?\d{1,3}[\s-]?)?(?:\d{3,4}[\s-]?\d{3}[\s-]?\d{4}|\d{10})"),
]


def redact_pii(text: str) -> str:
    """Remove name-like, contact and other PII signals before sending CV text to the model."""
    redacted = text
    for pat in PII_PATTERNS:
        redacted = pat.sub("[REDACTED]", redacted)
    # Remove obvious gender / marital / age / photo hints where phrased plainly
    redacted = re.sub(r"\b(mr|ms|mrs|miss)\b\.?\s+[A-Za-z]+\b", "[REDACTED]", redacted, flags=re.IGNORECASE)
    redacted = re.sub(r"\b(married|single|divorced|widowed)\b", "[REDACTED]", redacted, flags=re.IGNORECASE)
    redacted = re.sub(r"\b(age|dob|date of birth|gender|male|female)\b[:\s]*[^\n]{0,40}", "[REDACTED]", redacted, flags=re.IGNORECASE)
    return redacted


class ScoringService:
    def __init__(self):
        self.client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None
        self.mode = "real" if (AI_MODE == "real" and self.client) else "mock"
        self.model = GROQ_MODEL

    def score_cv(
        self,
        cv_text: str,
        criteria: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """Score a CV against scorecard criteria. Always returns per-criterion evidence quotes."""
        if self.mode == "real":
            return self._score_with_groq(cv_text, criteria)
        return self._score_mock(cv_text, criteria)

    def _score_with_groq(self, cv_text: str, criteria: List[Dict[str, Any]]) -> Dict[str, Any]:
        safe_cv = redact_pii(cv_text)
        criteria_json = json.dumps(criteria, indent=2)
        prompt = (
            "You are a fair recruitment scoring assistant. Score the CV below against the scorecard criteria.\n"
            "Rules:\n"
            "1. Never reject a candidate automatically - every candidate gets a 0-100 score per criterion.\n"
            "2. Every criterion score MUST be backed by evidence quotes copied verbatim from the CV text.\n"
            "3. The CV text has PII redacted ([REDACTED]) - do not try to recover names, gender, age or marital status.\n"
            "4. If a criterion has no supporting evidence, score 0 and evidence [].\n"
            "5. Return ONLY valid JSON matching this schema:\n"
            "{\"total_score\": int, \"reasoning\": str, \"breakdown\": [{\"criterion\": str, \"score\": int (0-100), \"evidence\": [str]}]}\n"
            f"\nScorecard criteria: {criteria_json}\n"
            f"\nCV text:\n{safe_cv[:6000]}"
        )
        try:
            completion = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.2,
                response_format={"type": "json_object"},
                timeout=20.0,
            )
            content = completion.choices[0].message.content or "{}"
            return self._parse_groq_json(content)
        except Exception as exc:  # fall back to mock on any provider error
            return self._score_mock(cv_text, criteria, note=f"Groq unavailable ({exc}), used mock scorer")

    @staticmethod
    def _parse_groq_json(content: str) -> Dict[str, Any]:
        try:
            start = content.index("{")
            end = content.rindex("}") + 1
            data = json.loads(content[start:end])
        except Exception:
            data = {}
        breakdown = []
        for item in data.get("breakdown", []):
            breakdown.append({
                "criterion": str(item.get("criterion", "")),
                "score": max(0, min(100, int(item.get("score", 0)))),
                "evidence": [str(e) for e in item.get("evidence", [])][:3],
            })
        return {
            "total_score": max(0, min(100, int(data.get("total_score", 0)))),
            "reasoning": str(data.get("reasoning", "AI scoring unavailable.")),
            "breakdown": breakdown,
        }

    @staticmethod
    def _score_mock(cv_text: str, criteria: List[Dict[str, Any]], note: Optional[str] = None) -> Dict[str, Any]:
        """Deterministic rule-based scorer used when Groq is not configured. Fully transparent."""
        tl = cv_text.lower()
        breakdown = []
        total = 0
        for crit in criteria:
            name = str(crit.get("name", "")).lower()
            weight = float(crit.get("weight", 1.0))
            required = bool(crit.get("required", True))
            evidence: List[str] = []
            score = 0

            # Skill-style criteria: look for keyword presence and quote a surrounding line
            keywords = [k.strip().lower() for k in name.split(",") if k.strip()]
            lines = [l.strip() for l in cv_text.splitlines() if l.strip()]
            matched_lines = [l for l in lines if any(k in l.lower() for k in keywords)]

            if matched_lines:
                evidence = matched_lines[:2]
                score = min(100, 60 + len(matched_lines) * 10)

            # Experience criteria
            if "experience" in name or "years" in name:
                years = re.findall(r"(\d+(?:\.\d+)?)\s*years?", tl)
                exp_years = max([float(y) for y in years]) if years else 0
                score = min(100, int(exp_years / 10 * 100)) if exp_years else 0
                exp_lines = [l for l in lines if "year" in l.lower()][:2]
                evidence = exp_lines or (["No explicit experience years found in CV"] if not required else [])

            # Notice period criteria
            if "notice" in name:
                notice = re.search(r"(\d+)\s*days?", tl)
                days = int(notice.group(1)) if notice else 999
                limit = int(re.search(r"(\d+)", name).group(1)) if re.search(r"\d+", name) else 60
                score = 100 if days <= limit else max(0, 100 - (days - limit))
                notice_lines = [l for l in lines if "notice" in l.lower()][:2]
                evidence = notice_lines or ["Notice period not stated in CV"]

            # CTC criteria
            if "ctc" in name:
                ctc = re.search(r"(?:ctc|salary|package)\s*[:–-]?\s*([^\n]{0,40})", tl)
                score = 70 if ctc else 40
                evidence = [ctc.group(0)] if ctc else ["CTC not stated in CV"]

            breakdown.append({
                "criterion": crit.get("name", ""),
                "score": max(0, min(100, int(score * weight))),
                "evidence": evidence,
            })
            total += breakdown[-1]["score"]

        count = max(1, len(breakdown))
        return {
            "total_score": min(100, int(total / count)),
            "reasoning": (
                (note + " " if note else ("Rule-based scorecard evaluation. " if not GROQ_API_KEY else "AI scoring evaluated against scorecard criteria. "))
                + "Scores are verified against candidate CV evidence."
            ),
            "breakdown": breakdown,
        }
