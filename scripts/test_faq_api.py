import sys
sys.path.insert(0, ".")
from dotenv import load_dotenv
load_dotenv("../.env")
from app import create_app
app = create_app()
with app.app_context():
    c = app.test_client()
    r = c.get("/api/faq")
    print("status", r.status_code)
    print("body", r.get_data(as_text=True)[:200])
