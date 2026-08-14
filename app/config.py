import os

from dotenv import load_dotenv

load_dotenv()


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret")
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg2://pitline:pitline@localhost:5432/pitline",
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    TEMPLATES_AUTO_RELOAD = True

    # Admin (/admin)
    ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
    ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "pitline-admin")
    MAX_CONTENT_LENGTH = int(os.getenv("MAX_UPLOAD_MB", "12")) * 1024 * 1024

    # Lead anti-abuse (in-memory per worker)
    LEAD_RATE_IP_LIMIT = int(os.getenv("LEAD_RATE_IP_LIMIT", "8"))
    LEAD_RATE_IP_WINDOW = int(os.getenv("LEAD_RATE_IP_WINDOW", "600"))
    LEAD_RATE_CONTACT_LIMIT = int(os.getenv("LEAD_RATE_CONTACT_LIMIT", "4"))
    LEAD_RATE_CONTACT_WINDOW = int(os.getenv("LEAD_RATE_CONTACT_WINDOW", "600"))
    LEAD_RATE_BURST_LIMIT = int(os.getenv("LEAD_RATE_BURST_LIMIT", "2"))
    LEAD_RATE_BURST_WINDOW = int(os.getenv("LEAD_RATE_BURST_WINDOW", "20"))
    LEAD_BUILD_MAX_ITEMS = int(os.getenv("LEAD_BUILD_MAX_ITEMS", "40"))
    LEAD_BUILD_MAX_CHARS = int(os.getenv("LEAD_BUILD_MAX_CHARS", "12000"))
