import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./recruit.db")
SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-change-me")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "600"))

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
_model = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
if _model in ("gpt-oss-120b", "gpt-oss-20b"):
    _model = f"openai/{_model}"
GROQ_MODEL = _model
AI_MODE = os.getenv("AI_MODE", "real")

MAX_UPLOAD_FILES = int(os.getenv("MAX_UPLOAD_FILES", "500"))
MAX_FILE_MB = int(os.getenv("MAX_FILE_MB", "10"))
