import sys, os
# Add backend to Python path so Vercel can import the FastAPI app
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(__file__)), "backend"))
from app.main import app  # noqa: F401  — Vercel detects the ASGI `app` export
