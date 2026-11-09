import os
import socket
import urllib.parse
import urllib.request
import json
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

load_dotenv()
backend_env = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
if os.path.exists(backend_env):
    load_dotenv(backend_env)

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    if os.getenv("VERCEL") or os.getenv("AWS_LAMBDA_FUNCTION_NAME"):
        DATABASE_URL = "sqlite:////tmp/recruit.db"
    else:
        DATABASE_URL = "sqlite:///./recruit.db"
elif DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)


def _get_connect_args(url: str) -> dict:
    if url.startswith("sqlite"):
        return {"check_same_thread": False}
    connect_args = {}
    try:
        parsed = urllib.parse.urlparse(url)
        hostname = parsed.hostname
        if hostname and not hostname.startswith("localhost") and hostname != "127.0.0.1":
            try:
                socket.gethostbyname(hostname)
            except Exception:
                # System DNS failed (e.g. home router DNS refusal). Resolve via Google DoH fallback.
                doh_url = f"https://dns.google/resolve?name={hostname}&type=A"
                req = urllib.request.Request(doh_url, headers={"User-Agent": "Mozilla/5.0"})
                with urllib.request.urlopen(req, timeout=4) as resp:
                    data = json.loads(resp.read().decode())
                    for ans in data.get("Answer", []):
                        if ans.get("type") == 1 and ans.get("data"):
                            connect_args["hostaddr"] = ans["data"]
                            break
    except Exception:
        pass
    return connect_args


connect_args = _get_connect_args(DATABASE_URL)

engine = create_engine(DATABASE_URL, connect_args=connect_args, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
